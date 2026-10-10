import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/catalog.dart';
import '../../core/prefs.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import 'app_card.dart';

/// All the apps this person may open, grouped like the web (Academics, Front Office, Financial…).
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
        final apps = all.where((a) => _q.isEmpty || '${a.name} ${a.description}'.toLowerCase().contains(_q.toLowerCase())).toList();
        final byKey = {for (final a in apps) a.key: a};
        final quick = [...lists.starred, ...lists.recent.where((k) => !lists.starred.contains(k))].map((k) => byKey[k]).whereType<AppDef>().take(4).toList();
        final cats = s == null || cat == null ? <String>[] : categoriesFor(s, cat);
        return RefreshIndicator(
          onRefresh: () => ref.read(sessionProvider.notifier).refreshPermissions(),
          child: ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 24), children: [
            const Text('Apps', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: C.ink)),
            const Text('Select an app to start your session.', style: TextStyle(color: C.slate500)),
            const SizedBox(height: 14),
            TextField(onChanged: (v) => setState(() => _q = v), decoration: const InputDecoration(hintText: 'Search apps', prefixIcon: Icon(Icons.search))),
            const SizedBox(height: 10),
            if (quick.isNotEmpty) ...[const SectionTitle('Quick Access'), ...quick.map(_card)],
            for (final c in cats) ...[
              if (apps.any((a) => a.category == c)) ...[SectionTitle(c), ...apps.where((a) => a.category == c).map(_card)],
            ],
            if (apps.isEmpty) EmptyState(icon: Icons.apps_outlined, title: _q.isEmpty ? 'No apps yet' : 'No app matches "$_q"', hint: _q.isEmpty ? 'Ask the school administrator to give your role access to apps.' : null),
          ]),
        );
      },
    );
  }

  Widget _card(AppDef a) => Padding(padding: const EdgeInsets.only(bottom: 10), child: AppCard(app: a));
}
