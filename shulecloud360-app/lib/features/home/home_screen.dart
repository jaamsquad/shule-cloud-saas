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
import '../../core/widgets.dart';
import '../apps/app_card.dart';

/// Home: greeting, today's numbers for this person, and Quick Access to their apps.
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
    if (s == null) return const SizedBox.shrink();
    final byKey = {for (final a in apps) a.key: a};
    final quick = [...lists.starred, ...lists.recent.where((k) => !lists.starred.contains(k))].map((k) => byKey[k]).whereType<AppDef>().take(8).toList();
    final shown = quick.isNotEmpty ? quick : apps.where((a) => !a.locked).take(8).toList();
    final first = s.name.split(RegExp(r'[\s@]')).first;

    return RefreshIndicator(
      onRefresh: () async { ref.invalidate(_summaryProvider); await ref.read(sessionProvider.notifier).refreshPermissions(); },
      child: ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 28), children: [
        _Hero(greeting: '$_greet,', name: first, when: '${DateFormat('EEEE, d MMMM').format(_now)} · ${DateFormat('HH:mm').format(_now)}',
            role: _kindLabel(s), school: s.subdomain.toUpperCase()),
        const SizedBox(height: 16),
        const _Summary(),
        const SizedBox(height: 6),
        SectionTitle('Quick Access', subtitle: quick.isNotEmpty ? 'Your starred and recent apps' : 'Hold an app to star it',
            trailing: TextButton(onPressed: () => context.go('/apps'), child: const Text('All apps'))),
        if (shown.isEmpty)
          const EmptyState(icon: Icons.apps_rounded, title: 'No apps yet', hint: 'Ask the school administrator to give your role access to apps.')
        else
          Container(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: C.slate200)),
            child: AppGrid(apps: shown),
          ),
      ]),
    );
  }

  String _kindLabel(Session s) {
    switch (s.kind) {
      case UserKind.admin: return s.isAdmin ? 'Administrator' : s.role.replaceAll('_', ' ').toUpperCase();
      case UserKind.teacher: return 'Teacher';
      case UserKind.student: return 'Learner';
      case UserKind.parent: return 'Parent';
    }
  }
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
        List<Widget> tiles;
        if (s.kind == UserKind.teacher) {
          tiles = [
            StatTile(label: 'Classes', value: '${d['classCount'] ?? 0}', icon: Icons.class_outlined),
            StatTile(label: 'Subjects', value: '${d['subjectCount'] ?? 0}', icon: Icons.menu_book_outlined, color: const Color(0xFF7C3AED)),
            StatTile(label: 'Lessons / week', value: '${d['lessonsPerWeek'] ?? 0}', icon: Icons.schedule_outlined, color: const Color(0xFF0EA5E9)),
            StatTile(label: 'Class teacher of', value: '${d['classTeacherCount'] ?? 0}', icon: Icons.badge_outlined, color: C.green),
          ];
        } else if (s.kind == UserKind.student || s.kind == UserKind.parent) {
          final term = d['currentTerm'] is Map ? (d['currentTerm']['name'] ?? '') : (d['currentTerm'] ?? '');
          tiles = [
            StatTile(label: 'Fee balance', value: money(d['balance'] as num?), icon: Icons.account_balance_wallet_outlined, color: ((d['balance'] ?? 0) as num) > 0 ? C.red : C.green),
            StatTile(label: 'Paid', value: money(d['totalPaid'] as num?), icon: Icons.payments_outlined, color: C.green),
            StatTile(label: 'Billed', value: money(d['totalBilled'] as num?), icon: Icons.receipt_long_outlined, color: const Color(0xFF0284C7)),
            StatTile(label: 'This term', value: term.toString().isEmpty ? '—' : term.toString(), icon: Icons.event_outlined, hint: d['registrationStatus']?.toString()),
          ];
        } else {
          final m = (d['money'] ?? {}) as Map;
          final c = (d['counts'] ?? {}) as Map;
          tiles = [
            StatTile(label: 'Billed', value: money(m['billed'] as num?), icon: Icons.receipt_long_outlined, color: const Color(0xFF0284C7)),
            StatTile(label: 'Collected', value: money(m['collected'] as num?), icon: Icons.payments_outlined, color: C.green),
            StatTile(label: 'Outstanding', value: money(m['outstanding'] as num?), icon: Icons.warning_amber_rounded, color: C.red, hint: '${c['OVERDUE'] ?? 0} overdue'),
            StatTile(label: 'Invoices', value: '${c['ALL'] ?? 0}', icon: Icons.description_outlined),
          ];
        }
        return GridView.count(
          crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 2.15,
          children: tiles,
        );
      },
    );
  }
}

/// Greeting card in the brand gradient.
class _Hero extends StatelessWidget {
  final String greeting, name, when, role, school;
  const _Hero({required this.greeting, required this.name, required this.when, required this.role, required this.school});

  @override
  Widget build(BuildContext context) => Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF4F46E5), C.brand, Color(0xFF7C3AED)]),
          boxShadow: [BoxShadow(color: C.brand.withValues(alpha: 0.35), blurRadius: 20, offset: const Offset(0, 10))],
        ),
        child: Stack(children: [
          Positioned(right: -30, top: -40, child: Container(width: 150, height: 150, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.08)))),
          Positioned(right: 30, bottom: -60, child: Container(width: 110, height: 110, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.07)))),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Icon(Icons.wb_sunny_rounded, color: Color(0xFFFCD34D), size: 18),
                const SizedBox(width: 6),
                Text(when, style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12.5, fontWeight: FontWeight.w600)),
              ]),
              const SizedBox(height: 10),
              Text(greeting, style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 15)),
              Text(name.isEmpty ? 'Welcome' : '${name[0].toUpperCase()}${name.substring(1)}',
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.4)),
              const SizedBox(height: 12),
              Wrap(spacing: 6, runSpacing: 6, children: [_chip(Icons.verified_user_rounded, role), _chip(Icons.apartment_rounded, school)]),
            ]),
          ),
        ]),
      );

  Widget _chip(IconData i, String t) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white.withValues(alpha: 0.2))),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(i, size: 13, color: Colors.white), const SizedBox(width: 5),
          Text(t, style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w700, letterSpacing: 0.3)),
        ]),
      );
}
