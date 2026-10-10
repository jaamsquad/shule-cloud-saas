import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog.dart';
import '../../core/prefs.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/ui.dart';
import '../../core/widgets.dart';
import '../notifications/notifications_screen.dart';
import 'app_card.dart';

/// All the apps this person may open, as dashboard tiles grouped like the web
/// (Academics, Front Office, Financial…).
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
    final unread = ref.watch(unreadProvider).valueOrNull ?? 0;
    final header = CurvedHeader(
      title: 'Dashboard', unread: unread, onBell: () => context.push('/notifications'),
      below: Padding(
        padding: const EdgeInsets.only(top: 4, bottom: 2),
        child: TextField(
          onChanged: (v) => setState(() => _q = v),
          style: const TextStyle(fontSize: 14.5),
          decoration: InputDecoration(
            hintText: 'Search apps', prefixIcon: const Icon(Icons.search_rounded, color: C.slate400),
            filled: true, fillColor: Colors.white, isDense: true, contentPadding: const EdgeInsets.symmetric(vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
          ),
        ),
      ),
    );
    return appsAsync.when(
      loading: () => Column(children: [header, const Expanded(child: Center(child: CircularProgressIndicator()))]),
      error: (e, _) => Column(children: [header, Expanded(child: Center(child: Text('$e')))]),
      data: (all) {
        final q = _q.trim().toLowerCase();
        final apps = all.where((a) => q.isEmpty || '${a.name} ${a.description}'.toLowerCase().contains(q)).toList();
        final byKey = {for (final a in all) a.key: a};
        final quick = [...lists.starred, ...lists.recent.where((k) => !lists.starred.contains(k))].map((k) => byKey[k]).whereType<AppDef>().take(6).toList();
        final cats = s == null || cat == null ? <String>[] : categoriesFor(s, cat);
        Widget grid(List<AppDef> list) => TileGrid(children: [for (final a in list) AppFeatureTile(app: a, starred: lists.starred.contains(a.key))]);
        return RefreshIndicator(
          onRefresh: () => ref.read(sessionProvider.notifier).refreshPermissions(),
          child: ListView(padding: EdgeInsets.zero, children: [
            header,
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                if (q.isEmpty && quick.isNotEmpty) ...[const Heading('Quick Access'), grid(quick)],
                for (final c in cats)
                  if (apps.any((a) => a.category == c)) ...[Heading(c), grid(apps.where((a) => a.category == c).toList())],
                if (apps.isEmpty)
                  EmptyState(icon: Icons.apps_rounded, title: q.isEmpty ? 'No apps yet' : 'No app matches "$_q"',
                      hint: q.isEmpty ? 'Ask the school administrator to give your role access to apps.' : null),
                if (apps.isNotEmpty) const Padding(
                  padding: EdgeInsets.only(top: 18),
                  child: Text('Tip: hold an app to star it for Quick Access', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: C.slate400)),
                ),
              ]),
            ),
          ]),
        );
      },
    );
  }
}
