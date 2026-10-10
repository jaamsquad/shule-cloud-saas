import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_icon.dart';
import '../../core/catalog.dart';
import '../../core/prefs.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../shell/app_shell.dart';

/// An app's home: a banner in the app's colour, then its sections as tiles.
class AppScreen extends ConsumerStatefulWidget {
  final String appKey;
  const AppScreen({super.key, required this.appKey});
  @override
  ConsumerState<AppScreen> createState() => _AppScreenState();
}

class _AppScreenState extends ConsumerState<AppScreen> {
  String _q = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => ref.read(appListsProvider.notifier).touch(widget.appKey));
  }

  @override
  Widget build(BuildContext context) {
    final apps = ref.watch(appsProvider);
    final starred = ref.watch(appListsProvider).starred.contains(widget.appKey);
    return apps.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
      data: (list) {
        final app = list.where((a) => a.key == widget.appKey).firstOrNull;
        if (app == null) {
          return const EmptyState(icon: Icons.lock_outline_rounded, title: 'You don\'t have access to this app', hint: 'Ask the school administrator to add it to your role.');
        }
        final pages = app.sections.fold<int>(0, (n, s) => n + s.pages.length);
        final q = _q.toLowerCase();
        final sections = [
          for (final s in app.sections)
            SectionDef(s.label, s.module, s.pages.where((p) => q.isEmpty || p.label.toLowerCase().contains(q)).toList()),
        ].where((s) => s.pages.isNotEmpty).toList();

        return ListView(padding: EdgeInsets.zero, children: [
          _Banner(app: app, pages: pages, starred: starred, onStar: () => ref.read(appListsProvider.notifier).toggleStar(app.key)),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              if (app.locked) const _Locked(),
              if (app.path != null && app.sections.isEmpty)
                _PageTile(page: PageDef('Open ${app.name}', app.path!), color: app.color, onTap: () => context.push(pageRoute(app, PageDef(app.name, app.path!)))),
              if (pages > 6) ...[
                TextField(
                  onChanged: (v) => setState(() => _q = v),
                  decoration: InputDecoration(
                    hintText: 'Search ${app.name.toLowerCase()} pages', prefixIcon: const Icon(Icons.search_rounded),
                    filled: true, fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: C.slate200)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: C.slate200)),
                  ),
                ),
                const SizedBox(height: 16),
              ],
              for (final sec in sections) ...[
                if (app.sections.length > 1 || sec.label != app.name)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(4, 4, 4, 10),
                    child: Row(children: [
                      Container(width: 4, height: 16, decoration: BoxDecoration(color: app.color, borderRadius: BorderRadius.circular(2))),
                      const SizedBox(width: 8),
                      Expanded(child: Text(sec.label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: C.ink))),
                      Text('${sec.pages.length}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: C.slate400)),
                    ]),
                  ),
                LayoutBuilder(builder: (_, box) {
                  final cols = box.maxWidth >= 640 ? 3 : 2;
                  final w = (box.maxWidth - (cols - 1) * 10) / cols;
                  return Wrap(spacing: 10, runSpacing: 10, children: [
                    for (final p in sec.pages)
                      SizedBox(width: w, child: _PageTile(page: p, color: app.color, onTap: () => context.push(pageRoute(app, p)))),
                  ]);
                }),
                const SizedBox(height: 18),
              ],
              if (sections.isEmpty && q.isNotEmpty) EmptyState(icon: Icons.search_off_rounded, title: 'No page matches "$_q"'),
            ]),
          ),
        ]);
      },
    );
  }
}

class _Banner extends StatelessWidget {
  final AppDef app;
  final int pages;
  final bool starred;
  final VoidCallback onStar;
  const _Banner({required this.app, required this.pages, required this.starred, required this.onStar});

  @override
  Widget build(BuildContext context) {
    final hsl = HSLColor.fromColor(app.color);
    final deep = hsl.withLightness((hsl.lightness - 0.16).clamp(0.08, 1.0)).toColor();
    return Container(
      decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [app.color, deep])),
      child: Stack(children: [
        // soft decorative rings
        Positioned(right: -40, top: -50, child: _ring(170)),
        Positioned(right: 40, bottom: -70, child: _ring(120)),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 22, 12, 22),
          child: Row(children: [
            Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.25), borderRadius: BorderRadius.circular(20)),
              child: AppIcon(icon: app.icon, color: app.color, size: 60),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(app.name, style: const TextStyle(color: Colors.white, fontSize: 23, fontWeight: FontWeight.w800, letterSpacing: -0.3)),
                const SizedBox(height: 3),
                Text(app.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13, height: 1.3)),
                const SizedBox(height: 10),
                Wrap(spacing: 6, children: [
                  _chip('${app.sections.length} section${app.sections.length == 1 ? '' : 's'}'),
                  _chip('$pages page${pages == 1 ? '' : 's'}'),
                ]),
              ]),
            ),
            IconButton(
              onPressed: onStar, tooltip: starred ? 'Remove from Quick Access' : 'Add to Quick Access',
              icon: Icon(starred ? Icons.star_rounded : Icons.star_outline_rounded, color: starred ? const Color(0xFFFCD34D) : Colors.white, size: 26),
            ),
          ]),
        ),
      ]),
    );
  }

  Widget _ring(double d) => Container(width: d, height: d, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white.withValues(alpha: 0.12), width: 18)));

  Widget _chip(String t) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(20)),
        child: Text(t, style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w700)),
      );
}

/// A page as a tile: tinted icon, name, and a "New" mark for create pages.
class _PageTile extends StatelessWidget {
  final PageDef page;
  final Color color;
  final VoidCallback onTap;
  const _PageTile({required this.page, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: C.slate200)),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  width: 38, height: 38,
                  decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(11)),
                  child: Icon(pageIcon(page.label), color: color, size: 21),
                ),
                const Spacer(),
                if (page.create)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(6)),
                    child: const Text('NEW', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF15803D), letterSpacing: 0.5)),
                  )
                else
                  const Icon(Icons.arrow_outward_rounded, size: 16, color: C.slate400),
              ]),
              const SizedBox(height: 10),
              SizedBox(
                height: 36,
                child: Align(
                  alignment: Alignment.topLeft,
                  child: Text(page.label, maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13.5, height: 1.3, fontWeight: FontWeight.w700, color: C.slate800)),
                ),
              ),
            ]),
          ),
        ),
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
