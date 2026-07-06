import 'package:go_router/go_router.dart';
import '../features/splash/splash_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/student_select_screen.dart';
import '../features/shell/app_shell.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/bus/bus_screen.dart';
import '../features/academics/academics_screen.dart';
import '../features/attendance/attendance_screen.dart';
import '../features/misc/misc_screens.dart';

/// GoRouter: splash/login/select are full-screen; the 5 tabs live in the shell;
/// academic sub-sections push over the shell.
final appRouter = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/select', builder: (_, __) => const StudentSelectScreen()),

    // Shell (bottom nav)
    ShellRoute(
      builder: (_, __, child) => AppShell(child: child),
      routes: [
        GoRoute(path: '/', builder: (_, __) => const DashboardScreen()),
        GoRoute(path: '/bus', builder: (_, __) => const BusScreen()),
        GoRoute(path: '/academics', builder: (_, __) => const AcademicsScreen()),
        GoRoute(path: '/messages', builder: (_, __) => const MessagesScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      ],
    ),

    // Pushed detail routes
    GoRoute(path: '/academics/attendance', builder: (_, __) => const AttendanceScreen()),
    GoRoute(path: '/academics/homework', builder: (_, __) => const HomeworkScreen()),
    GoRoute(path: '/academics/timetable', builder: (_, __) => const TimetableScreen()),
    GoRoute(path: '/academics/fees', builder: (_, __) => const FeesScreen()),
    GoRoute(path: '/academics/library', builder: (_, __) => const LibraryScreen()),
    GoRoute(path: '/academics/announcements', builder: (_, __) => const AnnouncementsScreen()),
    GoRoute(path: '/academics/calendar', builder: (_, __) => const CalendarScreen()),
    GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
    GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
  ],
);
