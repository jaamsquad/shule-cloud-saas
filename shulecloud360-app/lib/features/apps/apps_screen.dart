import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/catalog.dart';
import '../../core/prefs.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import 'app_card.dart';

/// All the apps this person may open, laid out like a phone home screen and
/// grouped like the web (Academics, Front Office, Financial…).
class AppsScreen extends ConsumerStatefulWidget {
  const AppsScreen({super.key});
  @override
  ConsumerState<AppsScreen> createState() => _AppsScreenState();
}

class _AppsScreenState extends ConsumerState<AppsScreen> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(sessionProvider).valueOrNull;
    final cat = ref.watch(catalogProvider).valueOrNull;
    final appsAsync = ref.watch(appsProvider);
    final lists = ref.watch(appListsProvider);
    return appsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
      data: (all) {
        final searching = _q.trim().isNotEmpty;
        final found = all.where((a) => '${a.name} ${a.description}'.toLowerCase().contains(_q.toLowerCase())).toList();
        final byKey = {for (final a in all) a.key: a};
        final quick = [...lists.starred, ...lists.recent.where((k) => !lists.starred.contains(k))].map((k) => byKey[k]).whereType<AppDef>().take(8).toList();
        final cats = s == null || cat == null ? <String>[] : categoriesFor(s, cat);
        return RefreshIndicator(
          onRefresh: () => ref.read(sessionProvider.notifier).refreshPermissions(),
          child: ListView(padding: const EdgeInsets.fromLTRB(16, 18, 16, 28), children: [
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Apps', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: C.ink, letterSpacing: -0.4)),
                SizedBox(height: 2),
                Text('Tap to open · hold to star', style: TextStyle(color: C.slate500, fontSize: 13)),
              ])),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: C.brand.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                child: Text('${all.length} apps', style: const TextStyle(color: C.brandDark, fontWeight: FontWeight.w700, fontSize: 12)),
              ),
            ]),
            const SizedBox(height: 14),
            TextField(
              onChanged: (v) => setState(() => _q = v),
              decoration: InputDecoration(
                hintText: 'Search apps', prefixIcon: const Icon(Icons.search_rounded),
                filled: true, fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: C.slate200)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: C.slate200)),
              ),
            ),
            const SizedBox(height: 18),
            if (searching) ...[
              for (final a in found) Padding(padding: const EdgeInsets.only(bottom: 10), child: AppCard(app: a)),
              if (found.isEmpty) EmptyState(icon: Icons.search_off_rounded, title: 'No app matches "$_q"'),
            ] else ...[
              if (quick.isNotEmpty) _Group(title: 'Quick Access', icon: Icons.star_rounded, iconColor: const Color(0xFFF59E0B), apps: quick),
              for (final c in cats)
                if (all.any((a) => a.category == c)) _Group(title: c, apps: all.where((a) => a.category == c).toList()),
              if (all.isEmpty) const EmptyState(icon: Icons.apps_rounded, title: 'No apps yet', hint: 'Ask the school administrator to give your role access to apps.'),
            ],
          ]),
        );
      },
    );
  }
}

/// A group of apps on a white card, four (or more on wide screens) to a row.
class _Group extends StatelessWidget {
  final String title;
  final List<AppDef> apps;
  final IconData? icon;
  final Color? iconColor;
  const _Group({required this.title, required this.apps, this.icon, this.iconColor});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Container(
          padding: const EdgeInsets.fromLTRB(10, 14, 10, 6),
          decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: C.slate200),
            boxShadow: [BoxShadow(color: C.ink.withValues(alpha: 0.03), blurRadius: 12, offset: const Offset(0, 4))],
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Row(children: [
                if (icon != null) ...[Icon(icon, size: 18, color: iconColor), const SizedBox(width: 6)],
                Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: C.ink))),
                Text('${apps.length}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: C.slate400)),
              ]),
            ),
            const SizedBox(height: 6),
            AppGrid(apps: apps),
          ]),
        ),
      );
}
