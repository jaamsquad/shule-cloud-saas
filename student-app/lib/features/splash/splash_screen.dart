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
    context.go(authed ? '/' : '/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.accent,
      body: Column(children: [
        Container(height: MediaQuery.paddingOf(context).top + 6, color: AppColors.gold),
        Expanded(
          child: Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(
                width: 88,
                height: 88,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [BoxShadow(color: Color(0x33000000), blurRadius: 16, offset: Offset(0, 6))],
                ),
                child: const Icon(Icons.school_outlined, color: AppColors.accent, size: 42),
              ),
              const SizedBox(height: 20),
              const Text('Student Portal', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              const Text('SHULECLOUD SCHOOL SYSTEM',
                  style: TextStyle(color: AppColors.gold, letterSpacing: 2, fontSize: 11, fontWeight: FontWeight.w800)),
              const SizedBox(height: 36),
              SizedBox(
                width: 160,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(color: AppColors.gold, backgroundColor: Colors.white.withValues(alpha: 0.2)),
                ),
              ),
              const SizedBox(height: 14),
              Text('Getting your results ready…', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontWeight: FontWeight.w600)),
            ]),
          ),
        ),
      ]),
    );
  }
}
