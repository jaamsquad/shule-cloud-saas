import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog.dart';
import '../../core/session.dart';
import '../../core/theme.dart';

/// The frame around every main screen: top bar with the logo and app switcher, a side menu
/// (the open app's pages, then Home / Apps / Help / Settings / Logout) and a bottom bar.
class AppShell extends ConsumerWidget {
  final Widget child;
  final String location;
  const AppShell({super.key, required this.child, required this.location});

  int get _tab => location.startsWith('/apps') ? 1 : location.startsWith('/account') ? 2 : 0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(sessionProvider).valueOrNull;
    final apps = ref.watch(appsProvider).valueOrNull ?? const <AppDef>[];
    final openKey = RegExp(r'^/apps/([^/?]+)').firstMatch(location)?.group(1);
    final open = openKey == null ? null : apps.where((a) => a.key == openKey).firstOrNull;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(children: [
          Image.asset('assets/images/logo.png', height: 30),
          const SizedBox(width: 6),
          const Text('360', style: TextStyle(color: C.brand, fontWeight: FontWeight.w800, fontSize: 13, letterSpacing: 2)),
        ]),
        actions: [
          IconButton(tooltip: 'Apps', icon: const Icon(Icons.apps_rounded), onPressed: () => _switcher(context, apps)),
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: GestureDetector(
              onTap: () => context.go('/account'),
              child: CircleAvatar(radius: 16, backgroundColor: C.brand.withValues(alpha: 0.12),
                  child: Text(_initials(s?.name ?? ''), style: const TextStyle(color: C.brandDark, fontWeight: FontWeight.w800, fontSize: 12))),
            ),
          ),
        ],
      ),
      drawer: _SideMenu(open: open, location: location),
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => context.go(const ['/', '/apps', '/account'][i]),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view_rounded), label: 'Apps'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Account'),
        ],
      ),
    );
  }

  void _switcher(BuildContext context, List<AppDef> apps) {
    showModalBottomSheet<void>(
      context: context, showDragHandle: true, backgroundColor: Colors.white, isScrollControlled: true,
      builder: (c) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('Switch app', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 10),
            Flexible(
              child: GridView.count(
                shrinkWrap: true, crossAxisCount: 4, childAspectRatio: 0.82,
                children: apps.where((a) => !a.locked).map((a) => InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () { Navigator.pop(c); context.go('/apps/${a.key}'); },
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Container(width: 46, height: 46, decoration: BoxDecoration(color: a.color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14)), child: Icon(a.icon, color: a.color)),
                    const SizedBox(height: 6),
                    Text(a.name, maxLines: 2, textAlign: TextAlign.center, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: C.slate700)),
                  ]),
                )).toList(),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

String _initials(String n) {
  final p = n.trim().split(RegExp(r'\s+')).where((x) => x.isNotEmpty).toList();
  if (p.isEmpty) return '?';
  return (p.first[0] + (p.length > 1 ? p.last[0] : '')).toUpperCase();
}

class _SideMenu extends ConsumerWidget {
  final AppDef? open;
  final String location;
  const _SideMenu({required this.open, required this.location});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(sessionProvider).valueOrNull;
    Widget row(IconData? icon, String label, VoidCallback onTap, {bool active = false, Color? color}) => ListTile(
          dense: true, visualDensity: const VisualDensity(vertical: -1),
          leading: icon == null ? null : Icon(icon, size: 20, color: active ? C.brandDark : (color ?? C.slate600)),
          title: Text(label, style: TextStyle(fontSize: 14, fontWeight: active ? FontWeight.w700 : FontWeight.w500, color: active ? C.brandDark : (color ?? C.slate700))),
          selected: active, selectedTileColor: C.brand.withValues(alpha: 0.08),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          onTap: () { Navigator.pop(context); onTap(); },
        );
    return Drawer(
      backgroundColor: Colors.white,
      child: SafeArea(
        child: ListView(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8), children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 6, 8, 12),
            child: Row(children: [
              if (open != null) Container(width: 34, height: 34, decoration: BoxDecoration(color: open!.color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)), child: Icon(open!.icon, color: open!.color, size: 19)),
              if (open != null) const SizedBox(width: 10),
              Expanded(child: Text(open?.name ?? 'Home', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: C.ink))),
            ]),
          ),
          if (open != null) ...[
            row(Icons.dashboard_outlined, 'Dashboard', () => context.go('/apps/${open!.key}'), active: location == '/apps/${open!.key}'),
            for (final sec in open!.sections)
              if (open!.sections.length == 1)
                for (final p in sec.pages) row(null, p.label, () => context.push(pageRoute(open!, p)))
              else
                ExpansionTile(
                  dense: true, tilePadding: const EdgeInsets.symmetric(horizontal: 16), shape: const Border(), collapsedShape: const Border(),
                  title: Text(sec.label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: C.slate700)),
                  childrenPadding: const EdgeInsets.only(left: 12),
                  children: [for (final p in sec.pages) row(null, p.label, () => context.push(pageRoute(open!, p)))],
                ),
            const Divider(height: 20),
          ],
          row(Icons.home_outlined, 'Home', () => context.go('/'), active: location == '/'),
          row(Icons.grid_view_outlined, 'Apps', () => context.go('/apps'), active: location == '/apps'),
          row(Icons.help_outline, 'Help', () => context.push('/help')),
          row(Icons.settings_outlined, 'Settings', () => context.go('/account'), active: location.startsWith('/account')),
          row(Icons.logout, 'Logout', () => confirmLogout(context, ref), color: C.red),
          if (s != null) Padding(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
            child: Text('${s.name} · ${s.subdomain}', style: const TextStyle(fontSize: 12, color: C.slate400)),
          ),
        ]),
      ),
    );
  }
}

/// Where a page opens: natively when the app has a screen for it, otherwise the web page.
String pageRoute(AppDef app, PageDef p) => Uri(path: '/open', queryParameters: {'portal': app.portal.name, 'path': p.path, 'title': p.label, 'app': app.key}).toString();

Future<void> confirmLogout(BuildContext context, WidgetRef ref) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (c) => AlertDialog(
      title: const Text('Log out?'),
      content: const Text('You will need your School ID and password to sign in again.', style: TextStyle(color: C.slate600)),
      actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')), FilledButton(style: FilledButton.styleFrom(minimumSize: const Size(90, 40)), onPressed: () => Navigator.pop(c, true), child: const Text('Log out'))],
    ),
  );
  if (ok == true) await ref.read(sessionProvider.notifier).logout();
}
