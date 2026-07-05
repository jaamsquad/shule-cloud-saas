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
    await ref.read(authControllerProvider.notifier).bootstrap();
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    final authed = ref.read(authControllerProvider).isAuthenticated;
    context.go(authed ? '/' : '/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(24)),
              child: const Icon(Icons.directions_bus_rounded, color: Colors.white, size: 48),
            ),
            const SizedBox(height: 20),
            const Text('ShuleCloud', style: TextStyle(color: AppColors.primary, fontSize: 30, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            const Text('Smart School Transport', style: TextStyle(color: AppColors.textMuted, fontSize: 16)),
            const SizedBox(height: 40),
            const SizedBox(
              width: 160,
              child: LinearProgressIndicator(color: AppColors.primary, backgroundColor: Color(0xFFE3E9E6)),
            ),
            const SizedBox(height: 16),
            const Text('Connecting to Secure Server', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
