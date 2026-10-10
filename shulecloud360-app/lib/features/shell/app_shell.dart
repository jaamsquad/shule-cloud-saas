import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/ui.dart';

/// The frame around every main screen: a side menu (the open app's pages, then Home /
/// Dashboard / Notifications / Help / Settings / Logout) and a bottom bar. Each screen
/// draws its own blue curved header.
class AppShell extends ConsumerWidget {
  final Widget child;
  final String location;
  const AppShell({super.key, required this.child, required this.location});

  int get _tab => location.startsWith('/apps') ? 1 : location.startsWith('/account') ? 2 : 0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final apps = ref.watch(appsProvider).valueOrNull ?? const <AppDef>[];
    final openKey = RegExp(r'^/apps/([^/?]+)').firstMatch(location)?.group(1);
    final open = openKey == null ? null : apps.where((a) => a.key == openKey).firstOrNull;

    return Scaffold(
      drawer: _SideMenu(open: open, location: location),
      body: child,
      bottomNavigationBar: NavigationBar(
        backgroundColor: Colors.white, surfaceTintColor: Colors.white, elevation: 8, shadowColor: Colors.black26,
        indicatorColor: C.brand.withValues(alpha: 0.12),
        selectedIndex: _tab,
        onDestinationSelected: (i) => context.go(const ['/', '/apps', '/account'][i]),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view_rounded), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Account'),
        ],
      ),
    );
  }
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
          Container(
            margin: const EdgeInsets.fromLTRB(0, 0, 0, 10),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(gradient: const LinearGradient(colors: [C.sky, C.blue]), borderRadius: BorderRadius.circular(18)),
            child: Row(children: [
              Avatar(name: s?.name ?? '', size: 46, color: C.blue),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(s?.name ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
                Text(open?.name ?? (s?.subdomain.toUpperCase() ?? ''), maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12.5)),
              ])),
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
          row(Icons.grid_view_outlined, 'Dashboard', () => context.go('/apps'), active: location == '/apps'),
          row(Icons.notifications_none_rounded, 'Notifications', () => context.push('/notifications')),
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
