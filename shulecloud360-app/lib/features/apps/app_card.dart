import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_icon.dart';
import '../../core/catalog.dart';
import '../../core/prefs.dart';
import '../../core/theme.dart';
import '../../core/ui.dart';

void openApp(BuildContext context, AppDef app) {
  if (app.locked) {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('This app is not in your school\'s plan. Contact ShuleCloud on 0726151104.')));
    return;
  }
  context.go('/apps/${app.key}');
}

/// Reference-style tile for an app: white card, illustrated icon, name. Hold for options.
class AppFeatureTile extends StatelessWidget {
  final AppDef app;
  final bool starred;
  const AppFeatureTile({super.key, required this.app, this.starred = false});
  @override
  Widget build(BuildContext context) => FeatureTile(
        icon: app.icon, color: app.color, label: app.name, locked: app.locked, starred: starred,
        onTap: () => openApp(context, app), onLongPress: () => _AppSheet.show(context, app),
      );
}

/// Long-press sheet: what's in the app, open it, star it.
class _AppSheet extends ConsumerWidget {
  final AppDef app;
  const _AppSheet(this.app);

  static void show(BuildContext context, AppDef app) => showModalBottomSheet<void>(
        context: context, backgroundColor: Colors.white, showDragHandle: true,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        builder: (_) => _AppSheet(app),
      );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final starred = ref.watch(appListsProvider).starred.contains(app.key);
    final pages = app.sections.fold<int>(0, (n, s) => n + s.pages.length);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            AppIcon(icon: app.icon, color: app.color, size: 56, locked: app.locked),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(app.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: C.ink)),
              const SizedBox(height: 2),
              Text(pages > 0 ? '$pages page${pages == 1 ? '' : 's'} · ${app.category}' : app.category, style: const TextStyle(color: C.slate500, fontSize: 13)),
            ])),
          ]),
          const SizedBox(height: 12),
          Text(app.description, style: const TextStyle(color: C.slate600, height: 1.4)),
          const SizedBox(height: 18),
          Row(children: [
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
                onPressed: () { ref.read(appListsProvider.notifier).toggleStar(app.key); Navigator.pop(context); },
                icon: Icon(starred ? Icons.star_rounded : Icons.star_outline_rounded, color: const Color(0xFFF59E0B)),
                label: Text(starred ? 'Unstar' : 'Star'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: app.color),
                onPressed: app.locked ? null : () { final router = GoRouter.of(context); Navigator.pop(context); router.go('/apps/${app.key}'); },
                icon: const Icon(Icons.arrow_forward_rounded), label: const Text('Open'),
              ),
            ),
          ]),
        ]),
      ),
    );
  }
}
