import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/api.dart';
import '../../core/catalog.dart';
import '../../core/prefs.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/ui.dart';
import '../../core/widgets.dart';
import '../apps/app_card.dart';
import '../notifications/notifications_screen.dart';

/// Home: blue header with the person's card, today's numbers, Quick Access tiles, latest notices.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});
  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  late Timer _t;
  DateTime _now = DateTime.now();
  @override
  void initState() { super.initState(); _t = Timer.periodic(const Duration(seconds: 30), (_) => setState(() => _now = DateTime.now())); }
  @override
  void dispose() { _t.cancel(); super.dispose(); }

  String get _greet => _now.hour < 12 ? 'Good morning' : _now.hour < 17 ? 'Good afternoon' : 'Good evening';

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(sessionProvider).valueOrNull;
    final apps = ref.watch(appsProvider).valueOrNull ?? const <AppDef>[];
    final lists = ref.watch(appListsProvider);
    final unread = ref.watch(unreadProvider).valueOrNull ?? 0;
    final notices = ref.watch(noticesProvider).valueOrNull ?? const <Notice>[];
    if (s == null) return const SizedBox.shrink();
    final byKey = {for (final a in apps) a.key: a};
    final quick = [...lists.starred, ...lists.recent.where((k) => !lists.starred.contains(k))].map((k) => byKey[k]).whereType<AppDef>().take(9).toList();
    final shown = quick.isNotEmpty ? quick : apps.where((a) => !a.locked).take(9).toList();
    final first = s.name.split(RegExp(r'[\s@]')).first;

    return RefreshIndicator(
      onRefresh: () async { ref.invalidate(_summaryProvider); ref.invalidate(noticesProvider); await ref.read(sessionProvider.notifier).refreshPermissions(); },
      child: ListView(padding: EdgeInsets.zero, children: [
        CurvedHeader(
          title: 'Home', unread: unread, onBell: () => context.push('/notifications'), extraBottom: 58,
          below: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text('$_greet, ${first.isEmpty ? '' : '${first[0].toUpperCase()}${first.substring(1)}'}',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.95), fontSize: 15, fontWeight: FontWeight.w600)),
          ),
        ),
        Transform.translate(
          offset: const Offset(0, -52),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _ProfileCard(name: s.name, role: _kindLabel(s), school: s.subdomain.toUpperCase(), when: DateFormat('EEE, d MMM · HH:mm').format(_now)),
          ),
        ),
        Transform.translate(
          offset: const Offset(0, -40),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const _Summary(),
              Heading('Quick Access', action: 'View all', onAction: () => context.go('/apps')),
              if (shown.isEmpty)
                const EmptyState(icon: Icons.apps_rounded, title: 'No apps yet', hint: 'Ask the school administrator to give your role access to apps.')
              else
                TileGrid(children: [for (final a in shown) AppFeatureTile(app: a, starred: lists.starred.contains(a.key))]),
              if (notices.isNotEmpty) ...[
                Heading('Latest notices', action: 'See all', onAction: () => context.push('/notifications')),
                for (final n in notices.take(3)) Padding(padding: const EdgeInsets.only(bottom: 10), child: NoticeCard(notice: n)),
              ],
            ]),
          ),
        ),
      ]),
    );
  }

  String _kindLabel(Session s) {
    switch (s.kind) {
      case UserKind.admin: return s.isAdmin ? 'Administrator' : s.role.replaceAll('_', ' ').split(' ').map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}').join(' ');
      case UserKind.teacher: return 'Teacher';
      case UserKind.student: return 'Learner';
      case UserKind.parent: return 'Parent';
    }
  }
}

/// The white card overlapping the header: avatar, name, role and school.
class _ProfileCard extends StatelessWidget {
  final String name, role, school, when;
  const _ProfileCard({required this.name, required this.role, required this.school, required this.when});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: const Color(0xFF1E3A8A).withValues(alpha: 0.12), blurRadius: 20, offset: const Offset(0, 8))],
        ),
        child: Row(children: [
          Avatar(name: name, size: 56),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: C.ink)),
              const SizedBox(height: 3),
              Text('$role  |  $school', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, color: C.slate500, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Row(children: [
                const Icon(Icons.schedule_rounded, size: 13, color: C.brand), const SizedBox(width: 4),
                Text(when, style: const TextStyle(fontSize: 11.5, color: C.brand, fontWeight: FontWeight.w700)),
              ]),
            ]),
          ),
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => context.go('/account'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(color: C.brand.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.person_outline_rounded, color: C.brand, size: 20),
            ),
          ),
        ]),
      );
}

/// Live numbers for whoever is signed in.
final _summaryProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final s = ref.watch(sessionProvider).valueOrNull;
  if (s == null) return null;
  final dio = ref.read(apiProvider);
  switch (s.kind) {
    case UserKind.teacher:
      return Map<String, dynamic>.from((await dio.get('/auth/staff-portal/summary')).data as Map);
    case UserKind.student:
    case UserKind.parent:
      return Map<String, dynamic>.from((await dio.get('/auth/student-portal/summary')).data as Map);
    case UserKind.admin:
      final apps = ref.read(appsProvider).valueOrNull ?? const <AppDef>[];
      if (!apps.any((a) => a.key == 'fees' && !a.locked)) return null;
      final r = await dio.get('/schools/default/invoices', queryParameters: {'limit': 1});
      return Map<String, dynamic>.from(((r.data as Map)['meta'] ?? {}) as Map);
  }
});

class _Summary extends ConsumerWidget {
  const _Summary();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(sessionProvider).valueOrNull;
    final async = ref.watch(_summaryProvider);
    return async.when(
      loading: () => const Padding(padding: EdgeInsets.all(18), child: Center(child: CircularProgressIndicator(strokeWidth: 2))),
      error: (_, __) => const SizedBox.shrink(),
      data: (d) {
        if (d == null || s == null) return const SizedBox.shrink();
        if (s.kind == UserKind.student || s.kind == UserKind.parent) return _FeesCard(d: d);
        final List<_Stat> stats;
        if (s.kind == UserKind.teacher) {
          stats = [
            _Stat('Classes', '${d['classCount'] ?? 0}', Icons.class_rounded, const [Color(0xFF5AB0FF), Color(0xFF2563EB)]),
            _Stat('Subjects', '${d['subjectCount'] ?? 0}', Icons.menu_book_rounded, const [Color(0xFFA78BFA), Color(0xFF7C3AED)]),
            _Stat('Lessons / week', '${d['lessonsPerWeek'] ?? 0}', Icons.schedule_rounded, const [Color(0xFF34D399), Color(0xFF059669)]),
            _Stat('Class teacher of', '${d['classTeacherCount'] ?? 0}', Icons.badge_rounded, const [Color(0xFFFDBA74), Color(0xFFF97316)]),
          ];
        } else {
          final m = (d['money'] ?? {}) as Map;
          final c = (d['counts'] ?? {}) as Map;
          stats = [
            _Stat('Collected', money(m['collected'] as num?), Icons.payments_rounded, const [Color(0xFF34D399), Color(0xFF059669)]),
            _Stat('Billed', money(m['billed'] as num?), Icons.receipt_long_rounded, const [Color(0xFF5AB0FF), Color(0xFF2563EB)]),
            _Stat('Outstanding', money(m['outstanding'] as num?), Icons.warning_amber_rounded, const [Color(0xFFFDA4AF), Color(0xFFE11D48)], hint: '${c['OVERDUE'] ?? 0} overdue'),
            _Stat('Invoices', '${c['ALL'] ?? 0}', Icons.description_rounded, const [Color(0xFFFDBA74), Color(0xFFF97316)]),
          ];
        }
        return SizedBox(
          height: 118,
          child: ListView.separated(
            scrollDirection: Axis.horizontal, clipBehavior: Clip.none,
            itemCount: stats.length, separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, i) => _StatCard(stats[i]),
          ),
        );
      },
    );
  }
}

class _Stat {
  final String label, value;
  final IconData icon;
  final List<Color> colors;
  final String? hint;
  const _Stat(this.label, this.value, this.icon, this.colors, {this.hint});
}

/// Colourful summary card (the "All Classes" cards in the reference).
class _StatCard extends StatelessWidget {
  final _Stat s;
  const _StatCard(this.s);
  @override
  Widget build(BuildContext context) => Container(
        width: 158,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: s.colors),
          borderRadius: BorderRadius.circular(18),
          boxShadow: [BoxShadow(color: s.colors.last.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 6))],
        ),
        child: Stack(children: [
          Positioned(right: -8, bottom: -10, child: Icon(s.icon, size: 64, color: Colors.white.withValues(alpha: 0.16))),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.25), borderRadius: BorderRadius.circular(10)),
              child: Icon(s.icon, size: 18, color: Colors.white),
            ),
            const Spacer(),
            FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft,
                child: Text(s.value, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900))),
            Text(s.hint == null ? s.label : '${s.label} · ${s.hint}', maxLines: 1, overflow: TextOverflow.ellipsis,
                style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 11.5, fontWeight: FontWeight.w600)),
          ]),
        ]),
      );
}

/// Learners and parents: how much of the fees is paid, as a ring, with the balance.
class _FeesCard extends StatelessWidget {
  final Map<String, dynamic> d;
  const _FeesCard({required this.d});
  @override
  Widget build(BuildContext context) {
    final billed = ((d['totalBilled'] ?? 0) as num).toDouble();
    final paid = ((d['totalPaid'] ?? 0) as num).toDouble();
    final balance = ((d['balance'] ?? 0) as num).toDouble();
    final pct = billed <= 0 ? 0.0 : (paid / billed).clamp(0.0, 1.0);
    final term = d['currentTerm'] is Map ? (d['currentTerm']['name'] ?? '') : (d['currentTerm'] ?? '');
    return Column(children: [
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: const Color(0xFF1E3A8A).withValues(alpha: 0.07), blurRadius: 14, offset: const Offset(0, 6))]),
        child: Row(children: [
          ProgressRing(value: pct, center: '${(pct * 100).round()}', caption: '% paid'),
          const SizedBox(width: 16),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Fees this term', style: TextStyle(fontSize: 12, color: C.slate500, fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(money(balance), style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: balance > 0 ? C.red : C.green)),
              Text(balance > 0 ? 'Balance to pay' : 'All paid — thank you', style: const TextStyle(fontSize: 12, color: C.slate500)),
              const SizedBox(height: 8),
              Text('Paid ${money(paid)} of ${money(billed)}', style: const TextStyle(fontSize: 12, color: C.slate600, fontWeight: FontWeight.w600)),
            ]),
          ),
        ]),
      ),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [C.sky, C.blue]), borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: C.blue.withValues(alpha: 0.3), blurRadius: 14, offset: const Offset(0, 6))],
        ),
        child: Row(children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(term.toString().isEmpty ? '—' : term.toString(), style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
            Text('Current term', style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12)),
          ]),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
            child: Text((d['registrationStatus'] ?? 'Enrolled').toString(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
          ),
        ]),
      ),
    ]);
  }
}
