import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../features/splash/splash_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/map/map_screen.dart';
import '../features/students/students_screen.dart';
import '../features/students/student_detail_screen.dart';
import '../features/qr/qr_scanner_screen.dart';
import '../features/route/route_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/incident/incident_screen.dart';
import '../features/inspection/inspection_screen.dart';
import '../features/sos/sos_screen.dart';
import '../features/settings/settings_screen.dart';
import '../widgets/main_shell.dart';

/// GoRouter with a bottom-nav shell (Home / Students / Map / Alerts / Settings)
/// and full-screen routes for flows launched from within.
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final loggingIn = state.matchedLocation == '/login';
      final splashing = state.matchedLocation == '/splash';
      if (splashing) return null;
      if (!auth.isAuthenticated && !loggingIn) return '/login';
      if (auth.isAuthenticated && loggingIn) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),

      // Bottom-nav shell
      ShellRoute(
        builder: (_, __, child) => MainShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/students', builder: (_, __) => const StudentsScreen()),
          GoRoute(path: '/map', builder: (_, __) => const MapScreen()),
          GoRoute(path: '/alerts', builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
        ],
      ),

      // Full-screen flows
      GoRoute(path: '/student/:id', builder: (_, s) => StudentDetailScreen(studentId: s.pathParameters['id']!)),
      // mode = 'board' | 'drop' | 'lookup' (default). Board/drop apply immediately.
      GoRoute(path: '/scan', builder: (_, s) => QrScannerScreen(mode: s.uri.queryParameters['mode'] ?? 'lookup')),
      GoRoute(path: '/route', builder: (_, __) => const RouteScreen()),
      GoRoute(path: '/incident', builder: (_, __) => const IncidentScreen()),
      GoRoute(path: '/inspection', builder: (_, __) => const InspectionScreen()),
      GoRoute(path: '/sos', builder: (_, __) => const SosScreen()),
    ],
  );
});
