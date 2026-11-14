import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/api.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/ui.dart';
import '../../core/widgets.dart';

/// A school notice as the app shows it.
class Notice {
  final String title, body, from, audience;
  final DateTime? at;
  const Notice(this.title, this.body, this.from, this.audience, this.at);

  factory Notice.fromJson(Map j) => Notice(
        (j['title'] ?? j['subject'] ?? 'Notice').toString(),
        (j['message'] ?? j['content'] ?? j['body'] ?? j['description'] ?? '').toString(),
        (j['createdByName'] ?? j['author'] ?? j['postedBy'] ?? j['createdBy']?['name'] ?? 'School office').toString(),
        (j['audience'] ?? 'All').toString(),
        DateTime.tryParse((j['createdAt'] ?? j['date'] ?? '').toString())?.toLocal(),
      );
}

/// Notices for whoever is signed in (each portal has its own feed).
final noticesProvider = FutureProvider.autoDispose<List<Notice>>((ref) async {
  final s = ref.watch(sessionProvider).valueOrNull;
  if (s == null) return const [];
  final path = s.teaching ? '/auth/staff-portal/announcements' : switch (s.kind) {
    UserKind.admin => '/announcements',
    UserKind.teacher => '/auth/staff-portal/announcements',
    UserKind.student => '/auth/student-portal/announcements',
    UserKind.parent => '/auth/parent-portal/announcements',
  };
  try {
    final d = (await ref.read(apiProvider).get(path)).data;
    final list = d is List ? d : (d is Map ? (d['data'] ?? d['announcements'] ?? d['items'] ?? const []) : const []) as List;
    return list.whereType<Map>().map(Notice.fromJson).toList();
  } catch (_) {
    return const [];
  }
});

String _seenKey(Session s) => 'sc360_seen_${s.subdomain}_${s.kind.name}_${s.teaching ? 't' : 'a'}_${s.name}';

/// How many notices arrived since this person last opened the list.
final unreadProvider = FutureProvider.autoDispose<int>((ref) async {
  final s = ref.watch(sessionProvider).valueOrNull;
  final list = await ref.watch(noticesProvider.future);
  if (s == null || list.isEmpty) return 0;
  final seen = DateTime.fromMillisecondsSinceEpoch((await SharedPreferences.getInstance()).getInt(_seenKey(s)) ?? 0);
  return list.where((n) => n.at != null && n.at!.isAfter(seen)).length;
});

String ago(DateTime? t) {
  if (t == null) return '';
  final d = DateTime.now().difference(t);
  if (d.inMinutes < 1) return 'Just now';
  if (d.inMinutes < 60) return '${d.inMinutes} min ago';
  if (d.inHours < 24) return '${d.inHours} hr ago';
  if (d.inDays < 7) return '${d.inDays} day${d.inDays == 1 ? '' : 's'} ago';
  return DateFormat('d MMM y').format(t);
}

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});
  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    // opening the list marks everything as seen
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final s = ref.read(sessionProvider).valueOrNull;
      if (s == null) return;
      (await SharedPreferences.getInstance()).setInt(_seenKey(s), DateTime.now().millisecondsSinceEpoch);
      ref.invalidate(unreadProvider);
    });
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(noticesProvider);
    return Scaffold(
      body: Column(children: [
        const CurvedHeader(title: 'Notifications', back: true),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async => ref.invalidate(noticesProvider),
            child: async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => ListView(children: const [EmptyState(icon: Icons.wifi_off_rounded, title: 'Could not load notifications')]),
              data: (list) => list.isEmpty
                  ? ListView(children: const [EmptyState(icon: Icons.notifications_none_rounded, title: 'No notifications yet', hint: 'School notices will show up here.')])
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                      itemCount: list.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) => NoticeCard(notice: list[i]),
                    ),
            ),
          ),
        ),
      ]),
    );
  }
}

/// One notice: avatar, who posted it, when, title and the message.
class NoticeCard extends StatelessWidget {
  final Notice notice;
  const NoticeCard({super.key, required this.notice});
  static const _colors = [C.iconTile, C.slate700, C.slate600, C.slate800];   // grey avatars — no colour

  @override
  Widget build(BuildContext context) {
    final color = _colors[notice.from.hashCode.abs() % _colors.length];
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => showModalBottomSheet<void>(
        context: context, showDragHandle: true, isScrollControlled: true, backgroundColor: Colors.white,
        builder: (_) => SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(notice.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: C.ink)),
              const SizedBox(height: 4),
              Text('${notice.from} · ${ago(notice.at)}', style: const TextStyle(color: C.slate500, fontSize: 12.5)),
              const SizedBox(height: 14),
              Text(notice.body, style: const TextStyle(fontSize: 14.5, height: 1.5, color: C.slate700)),
            ]),
          ),
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: const Color(0xFF1E3A8A).withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Avatar(name: notice.from, size: 44, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(notice.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800, color: C.ink, fontSize: 14.5))),
                const SizedBox(width: 6),
                Text(ago(notice.at), style: const TextStyle(fontSize: 11, color: C.slate400)),
              ]),
              const SizedBox(height: 2),
              Row(children: [
                const Icon(Icons.person_rounded, size: 12, color: C.slate400), const SizedBox(width: 3),
                Flexible(child: Text(notice.from, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11.5, color: C.slate500))),
              ]),
              const SizedBox(height: 6),
              Text(notice.body, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, height: 1.35, color: C.slate600)),
            ]),
          ),
        ]),
      ),
    );
  }
}
