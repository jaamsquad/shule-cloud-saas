import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';

/// Bottom-nav shell hosting the 5 primary tabs (Dashboard, Classes, Scan,
/// Alerts, Profile) per the Stitch designs.
class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  static const _tabs = ['/', '/classes', '/scan', '/alerts', '/profile'];

  int _indexFor(String location) {
    final i = _tabs.indexWhere((t) => t == '/' ? location == '/' : location.startsWith(t));
    return i < 0 ? 0 : i;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;
    final online = ref.watch(onlineStatusProvider).valueOrNull ?? true;
    return Scaffold(
      body: Column(
        children: [
          if (!online) const OfflineBanner(),
          Expanded(child: child),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _indexFor(location),
        onDestinationSelected: (i) => context.go(_tabs[i]),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.school_outlined), selectedIcon: Icon(Icons.school), label: 'Classes'),
          NavigationDestination(icon: Icon(Icons.qr_code_scanner_outlined), selectedIcon: Icon(Icons.qr_code_scanner), label: 'Scan'),
          NavigationDestination(icon: Icon(Icons.notifications_outlined), selectedIcon: Icon(Icons.notifications), label: 'Alerts'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
