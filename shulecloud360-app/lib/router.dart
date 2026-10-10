import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/session.dart';
import 'core/theme.dart';
import 'features/account/account_screen.dart';
import 'features/apps/app_screen.dart';
import 'features/apps/apps_screen.dart';
import 'features/home/home_screen.dart';
import 'features/login/login_screen.dart';
import 'features/notifications/notifications_screen.dart';
import 'features/login/welcome_screen.dart';
import 'features/shell/app_shell.dart';
import 'features/web/page_router.dart';

class _SessionListenable extends ChangeNotifier {
  _SessionListenable(Ref ref) { ref.listen(sessionProvider, (_, __) => notifyListeners()); }
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _SessionListenable(ref);
  return GoRouter(
    refreshListenable: refresh,
    redirect: (context, state) {
      final s = ref.read(sessionProvider);
      if (s.isLoading) return state.matchedLocation == '/splash' ? null : '/splash';
      final signedIn = s.valueOrNull != null;
      final atLogin = state.matchedLocation == '/login' || state.matchedLocation == '/welcome';
      if (!signedIn) return atLogin ? null : '/welcome';
      if (atLogin || state.matchedLocation == '/splash') return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const _Splash()),
      GoRoute(path: '/welcome', pageBuilder: (_, st) => _fade(st, const WelcomeScreen())),
      GoRoute(path: '/login', pageBuilder: (_, st) => _fade(st, const LoginScreen())),
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
      GoRoute(path: '/help', builder: (_, __) => const HelpScreen()),
      GoRoute(path: '/open', builder: (_, st) => openPage(
            portal: st.uri.queryParameters['portal'] ?? 'admin', path: st.uri.queryParameters['path'] ?? '/',
            title: st.uri.queryParameters['title'] ?? 'ShuleCloud', forceWeb: st.uri.queryParameters['web'] == '1')),
      ShellRoute(
        builder: (_, st, child) => AppShell(location: st.uri.toString(), child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/apps', builder: (_, __) => const AppsScreen(), routes: [
            GoRoute(path: ':key', builder: (_, st) => AppScreen(key: ValueKey(st.pathParameters['key']), appKey: st.pathParameters['key']!)),
          ]),
          GoRoute(path: '/account', builder: (_, __) => const AccountScreen()),
        ],
      ),
    ],
  );
});

Page<void> _fade(GoRouterState st, Widget child) => CustomTransitionPage<void>(
      key: st.pageKey, child: child, transitionDuration: const Duration(milliseconds: 450),
      transitionsBuilder: (_, a, __, c) => FadeTransition(opacity: CurvedAnimation(parent: a, curve: Curves.easeOut), child: c),
    );

class _Splash extends StatelessWidget {
  const _Splash();
  @override
  Widget build(BuildContext context) => Scaffold(
        body: Container(
          decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [C.sky, C.blue])),
          child: Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(
                width: 110, height: 110, padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(32),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.18), blurRadius: 24, offset: const Offset(0, 10))]),
                child: Image.asset('assets/images/icon.png'),
              ),
              const SizedBox(height: 20),
              const Text('SHULECLOUD 360', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 2)),
              const SizedBox(height: 4),
              Text('Staff · Student · Parent', style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13, fontWeight: FontWeight.w600)),
            ]),
          ),
        ),
      );
}
