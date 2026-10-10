import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/session.dart';
import 'features/account/account_screen.dart';
import 'features/apps/app_screen.dart';
import 'features/apps/apps_screen.dart';
import 'features/home/home_screen.dart';
import 'features/login/login_screen.dart';
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
        backgroundColor: Colors.white,
        body: Center(child: Image.asset('assets/images/logo.png', width: 200)),
      );
}
