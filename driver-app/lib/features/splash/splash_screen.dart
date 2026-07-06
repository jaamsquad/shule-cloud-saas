import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';

/// Splash: bootstraps auto-login, then routes to dashboard or login.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});
  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    // Bootstrap (auto-login) must never hang the splash: guard it AND cap it with
    // a timeout so a slow/unreachable backend still lets the user reach login.
    try {
      await ref
          .read(authControllerProvider.notifier)
          .bootstrap()
          .timeout(const Duration(seconds: 8));
    } catch (e) {
      debugPrint('bootstrap failed/timed out: $e');
    }
    await Future.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;
    final authed = ref.read(authControllerProvider).isAuthenticated;
    context.go(authed ? '/' : '/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primary, // dark blue
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 108,
              height: 108,
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28)),
              child: const Icon(Icons.directions_bus_rounded, color: AppColors.primary, size: 56),
            ),
            const SizedBox(height: 22),
            const Text('ShuleDriver', style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            const Text('Smart School Transport', style: TextStyle(color: Colors.white70, fontSize: 16)),
            const SizedBox(height: 40),
            const SizedBox(
              width: 160,
              child: LinearProgressIndicator(color: Colors.white, backgroundColor: Colors.white24),
            ),
            const SizedBox(height: 16),
            const Text('Connecting to Secure Server', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
