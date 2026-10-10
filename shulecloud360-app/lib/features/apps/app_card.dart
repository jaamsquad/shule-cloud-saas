import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_icon.dart';
import '../../core/catalog.dart';
import '../../core/prefs.dart';
import '../../core/theme.dart';

void openApp(BuildContext context, AppDef app) {
  if (app.locked) {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('This app is not in your school\'s plan. Contact ShuleCloud on 0726151104.')));
    return;
  }
  context.go('/apps/${app.key}');
}

/// Apps four (or more on wide screens) to a row, each row as tall as its tallest name.
class AppGrid extends StatelessWidget {
  final List<AppDef> apps;
  const AppGrid({super.key, required this.apps});
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (_, box) {
        final cols = (box.maxWidth / 84).floor().clamp(4, 8);
        final w = box.maxWidth / cols;
        return Wrap(children: [for (final a in apps) SizedBox(width: w, child: AppTile(app: a))]);
      });
}

/// Launcher tile: the app icon with its name underneath, like a phone home screen.
/// Long-press to star it for Quick Access.
class AppTile extends ConsumerWidget {
  final AppDef app;
  const AppTile({super.key, required this.app});
  static const _label = TextStyle(fontSize: 11.5, height: 1.2, fontWeight: FontWeight.w600, color: C.slate700);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final starred = ref.watch(appListsProvider).starred.contains(app.key);
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => openApp(context, app),
      onLongPress: () => _AppSheet.show(context, app),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(2, 8, 2, 10),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Stack(clipBehavior: Clip.none, children: [
            AppIcon(icon: app.icon, color: app.color, size: 54, locked: app.locked),
            if (starred && !app.locked)
              Positioned(
                right: -5, top: -5,
                child: Container(
                  padding: const EdgeInsets.all(2.5),
                  decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                  child: const Icon(Icons.star_rounded, size: 15, color: Color(0xFFF59E0B)),
                ),
              ),
          ]),
          const SizedBox(height: 8),
          // one long word ("Communication") shrinks to fit rather than breaking mid-word
          app.name.trim().contains(' ')
              ? Text(app.name, maxLines: 2, textAlign: TextAlign.center, overflow: TextOverflow.ellipsis, style: _label)
              : FittedBox(fit: BoxFit.scaleDown, child: Text(app.name, maxLines: 1, style: _label)),
        ]),
      ),
    );
  }
}

/// Row card: icon, name, what's inside, and a star for Quick Access (search results).
class AppCard extends ConsumerWidget {
  final AppDef app;
  const AppCard({super.key, required this.app});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final starred = ref.watch(appListsProvider).starred.contains(app.key);
    return Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: C.slate200)),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => openApp(context, app),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 4, 12),
          child: Row(children: [
            AppIcon(icon: app.icon, color: app.color, size: 46, locked: app.locked),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(app.name, style: const TextStyle(fontWeight: FontWeight.w700, color: C.ink, fontSize: 15)),
                const SizedBox(height: 3),
                Text(app.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: C.slate500, fontSize: 12.5, height: 1.3)),
              ]),
            ),
            IconButton(
              tooltip: starred ? 'Remove from Quick Access' : 'Add to Quick Access',
              icon: Icon(starred ? Icons.star_rounded : Icons.star_outline_rounded, color: starred ? const Color(0xFFF59E0B) : C.slate400, size: 22),
              onPressed: () => ref.read(appListsProvider.notifier).toggleStar(app.key),
            ),
          ]),
        ),
      ),
    );
  }
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
