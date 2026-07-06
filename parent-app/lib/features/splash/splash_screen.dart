import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';

/// Splash → bootstraps auto-login, then routes to dashboard or login.
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
    // Guarded + time-capped so an unreachable backend still reaches login.
    try {
      await ref.read(authControllerProvider.notifier).bootstrap().timeout(const Duration(seconds: 8));
    } catch (_) {}
    await Future.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;
    final authed = ref.read(authControllerProvider).isAuthenticated;
    final hasMany = ref.read(authControllerProvider).students.length > 1;
    context.go(!authed ? '/login' : (hasMany ? '/select' : '/'));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 96, height: 96,
              decoration: BoxDecoration(color: AppColors.surfaceContainerHigh, borderRadius: BorderRadius.circular(24)),
              child: const Icon(Icons.school_rounded, color: AppColors.primary, size: 52),
            ),
            const SizedBox(height: 20),
            const Text.rich(TextSpan(children: [
              TextSpan(text: 'ShuleCloud', style: TextStyle(color: AppColors.primary, fontSize: 28, fontWeight: FontWeight.w800)),
              TextSpan(text: ' Parent', style: TextStyle(color: AppColors.onSurface, fontSize: 28, fontWeight: FontWeight.w800)),
            ])),
            const SizedBox(height: 6),
            const Text('SMART SCHOOL PLATFORM', style: TextStyle(color: AppColors.outline, letterSpacing: 2, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 36),
            const SizedBox(width: 160, child: LinearProgressIndicator(color: AppColors.primary, backgroundColor: Color(0xFFDDE7DA))),
            const SizedBox(height: 16),
            const Text('Syncing school data…', style: TextStyle(color: AppColors.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}
