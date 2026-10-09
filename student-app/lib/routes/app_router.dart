import 'package:go_router/go_router.dart';
import '../features/academics/academics_screens.dart';
import '../features/auth/login_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/fees/fees_screens.dart';
import '../features/misc/misc_screens.dart';
import '../features/shell/app_shell.dart';
import '../features/splash/splash_screen.dart';

/// GoRouter: splash/login are full-screen; every other page renders inside the
/// web-style portal shell (gold header + green sidebar/drawer, bottom bar on
/// the main pages on phones).
final appRouter = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    ShellRoute(
      builder: (_, __, child) => AppShell(child: child),
      routes: [
        GoRoute(path: '/', builder: (_, __) => const DashboardScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        GoRoute(path: '/results', builder: (_, __) => const ResultsScreen()),
        GoRoute(path: '/timetable', builder: (_, __) => const TimetableScreen()),
        GoRoute(path: '/assignments', builder: (_, __) => const TasksScreen(type: 'assignment', title: 'Assignments')),
        GoRoute(path: '/homework', builder: (_, __) => const TasksScreen(type: 'homework', title: 'Homework')),
        GoRoute(path: '/resources', builder: (_, __) => const ResourcesScreen()),
        GoRoute(path: '/calendar', builder: (_, __) => const CalendarScreen()),
        GoRoute(path: '/fees', builder: (_, __) => const FeesScreen()),
        GoRoute(path: '/wallet', builder: (_, __) => const WalletScreen()),
        GoRoute(path: '/receipts', builder: (_, __) => const ReceiptsScreen()),
        GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      ],
    ),
  ],
);
