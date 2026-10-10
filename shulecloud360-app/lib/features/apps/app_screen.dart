import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog.dart';
import '../../core/prefs.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../shell/app_shell.dart';

/// An app's dashboard: "What would you like to see today?" with its sections and pages.
class AppScreen extends ConsumerStatefulWidget {
  final String appKey;
  const AppScreen({super.key, required this.appKey});
  @override
  ConsumerState<AppScreen> createState() => _AppScreenState();
}

class _AppScreenState extends ConsumerState<AppScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => ref.read(appListsProvider.notifier).touch(widget.appKey));
  }

  @override
  Widget build(BuildContext context) {
    final apps = ref.watch(appsProvider);
    return apps.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
      data: (list) {
        final app = list.where((a) => a.key == widget.appKey).firstOrNull;
        if (app == null) {
          return const EmptyState(icon: Icons.lock_outline, title: 'You don\'t have access to this app', hint: 'Ask the school administrator to add it to your role.');
        }
        if (app.path != null && app.sections.isEmpty) {
          return Center(child: Padding(padding: const EdgeInsets.all(24), child: FilledButton.icon(
            onPressed: () => context.push(pageRoute(app, PageDef(app.name, app.path!))), icon: const Icon(Icons.open_in_new), label: Text('Open ${app.name}'))));
        }
        return ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 24), children: [
          Row(children: [
            Container(width: 46, height: 46, decoration: BoxDecoration(color: app.color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)), child: Icon(app.icon, color: app.color)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(app.name, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: C.ink)),
              const Text('What would you like to see today?', style: TextStyle(color: C.slate500)),
            ])),
          ]),
          const SizedBox(height: 16),
          if (app.locked) const Panel(child: Text('This app is not included in your school\'s plan. Contact ShuleCloud on 0726151104.', style: TextStyle(color: C.amber))),
          for (final sec in app.sections) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Panel(
                padding: EdgeInsets.zero,
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
                    child: Row(children: [
                      Expanded(child: Text(sec.label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: C.ink))),
                      Text('${sec.pages.length} page${sec.pages.length == 1 ? '' : 's'}', style: const TextStyle(fontSize: 12, color: C.slate400)),
                    ]),
                  ),
                  for (var i = 0; i < sec.pages.length; i++) ...[
                    if (i > 0) const Divider(indent: 16, endIndent: 16),
                    ListTile(
                      dense: true,
                      title: Text(sec.pages[i].label, style: const TextStyle(fontSize: 14.5, color: C.slate700, fontWeight: FontWeight.w500)),
                      trailing: const Icon(Icons.chevron_right, color: C.slate400),
                      onTap: () => context.push(pageRoute(app, sec.pages[i])),
                    ),
                  ],
                  const SizedBox(height: 6),
                ]),
              ),
            ),
          ],
        ]);
      },
    );
  }
}
