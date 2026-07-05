import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/theme/app_theme.dart';
import '../providers/providers.dart';

/// Bottom-navigation shell (Home / Students / Map / Alerts / Settings) plus a
/// persistent offline banner that appears whenever connectivity drops.
class MainShell extends ConsumerWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  static const _tabs = ['/', '/students', '/map', '/alerts', '/settings'];

  int _indexFor(String location) {
    final i = _tabs.indexWhere((t) => t == '/' ? location == '/' : location.startsWith(t));
    return i < 0 ? 0 : i;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).matchedLocation;
    final index = _indexFor(location);
    final online = ref.watch(onlineStatusProvider).valueOrNull ?? true;

    return Scaffold(
      body: Column(
        children: [
          if (!online)
            Container(
              width: double.infinity,
              color: AppColors.warning,
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              child: const Row(
                children: [
                  Icon(Icons.cloud_off, color: Colors.white, size: 18),
                  SizedBox(width: 8),
                  Expanded(child: Text('Offline — data will sync automatically', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600))),
                ],
              ),
            ),
          Expanded(child: child),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => context.go(_tabs[i]),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people), label: 'Students'),
          NavigationDestination(icon: Icon(Icons.map_outlined), selectedIcon: Icon(Icons.map), label: 'Map'),
          NavigationDestination(icon: Icon(Icons.notifications_outlined), selectedIcon: Icon(Icons.notifications), label: 'Alerts'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
        ],
      ),
    );
  }
}
