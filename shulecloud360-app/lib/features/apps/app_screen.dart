import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_icon.dart';
import '../../core/catalog.dart';
import '../../core/prefs.dart';
import '../../core/theme.dart';
import '../../core/ui.dart';
import '../../core/widgets.dart';
import '../notifications/notifications_screen.dart';
import '../shell/app_shell.dart';

/// An app: blue header with its name and one tab per section, the section's pages as tiles.
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
    final starred = ref.watch(appListsProvider).starred.contains(widget.appKey);
    final unread = ref.watch(unreadProvider).valueOrNull ?? 0;
    return apps.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
      data: (list) {
        final app = list.where((a) => a.key == widget.appKey).firstOrNull;
        if (app == null) {
          return Column(children: [
            CurvedHeader(title: 'App', back: true, onLeading: () => context.go('/apps')),
            const Expanded(child: EmptyState(icon: Icons.lock_outline_rounded, title: 'You don\'t have access to this app', hint: 'Ask the school administrator to add it to your role.')),
          ]);
        }
        final sections = app.sections.where((s) => s.pages.isNotEmpty).toList();
        final pages = sections.fold<int>(0, (n, s) => n + s.pages.length);
        final tabs = sections.length > 1;

        Widget tilesFor(List<PageDef> ps) => ListView(padding: const EdgeInsets.fromLTRB(16, 18, 16, 28), children: [
              if (app.locked) const _Locked(),
              TileGrid(children: [
                for (final p in ps)
                  FeatureTile(icon: pageIcon(p.label), color: app.color, label: p.label, badge: p.create ? 'NEW' : null, onTap: () => context.push(pageRoute(app, p))),
              ]),
            ]);

        final info = Row(children: [
          _chip(Icons.layers_outlined, '${sections.length} section${sections.length == 1 ? '' : 's'}'),
          const SizedBox(width: 6),
          _chip(Icons.description_outlined, '$pages page${pages == 1 ? '' : 's'}'),
          const Spacer(),
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => ref.read(appListsProvider.notifier).toggleStar(app.key),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: starred ? 0.95 : 0.18), borderRadius: BorderRadius.circular(20)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(starred ? Icons.star_rounded : Icons.star_outline_rounded, size: 16, color: starred ? const Color(0xFFF59E0B) : Colors.white),
                const SizedBox(width: 4),
                Text(starred ? 'Starred' : 'Star', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: starred ? C.slate700 : Colors.white)),
              ]),
            ),
          ),
        ]);

        final header = CurvedHeader(
          title: app.name, back: true, onLeading: () => context.go('/apps'),
          unread: unread, onBell: () => context.push('/notifications'),
          below: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            info,
            if (tabs) ...[const SizedBox(height: 6), HeaderTabs(labels: [for (final s in sections) s.label])],
          ]),
        );

        if (app.path != null && sections.isEmpty) {
          return Column(children: [
            header,
            Expanded(child: tilesFor([PageDef('Open ${app.name}', app.path!)])),
          ]);
        }
        if (!tabs) {
          return Column(children: [header, Expanded(child: tilesFor(sections.isEmpty ? const [] : sections.first.pages))]);
        }
        return DefaultTabController(
          length: sections.length,
          child: Column(children: [
            header,
            Expanded(child: TabBarView(children: [for (final s in sections) tilesFor(s.pages)])),
          ]),
        );
      },
    );
  }

  Widget _chip(IconData i, String t) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(20)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(i, size: 13, color: Colors.white), const SizedBox(width: 4),
          Text(t, style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w700)),
        ]),
      );
}

class _Locked extends StatelessWidget {
  const _Locked();
  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: const Color(0xFFFFFBEB), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFFDE68A))),
        child: const Row(children: [
          Icon(Icons.lock_rounded, color: C.amber, size: 20), SizedBox(width: 10),
          Expanded(child: Text('This app is not in your school\'s plan. Contact ShuleCloud on 0726151104.', style: TextStyle(color: Color(0xFF92400E), fontWeight: FontWeight.w600, fontSize: 13))),
        ]),
      );
}
