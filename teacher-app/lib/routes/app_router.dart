import 'package:go_router/go_router.dart';
import '../models/staff.dart';
import '../features/splash/splash_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/shell/app_shell.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/classes/classes_screen.dart';
import '../features/classes/class_detail_screen.dart';
import '../features/attendance/attendance_screen.dart';
import '../features/gradebook/gradebook_screen.dart';
import '../features/timetable/timetable_screen.dart';
import '../features/assignments/assignments_screens.dart';
import '../features/messaging/messaging_screen.dart';
import '../features/leave/leave_screen.dart';
import '../features/behaviour/behaviour_screen.dart';
import '../features/library/library_screen.dart';
import '../features/misc/misc_screens.dart';

/// GoRouter: splash/login are full-screen; the 5 tabs live in the shell;
/// everything else pushes over the shell.
final appRouter = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),

    // Shell (bottom nav)
    ShellRoute(
      builder: (_, __, child) => AppShell(child: child),
      routes: [
        GoRoute(path: '/', builder: (_, __) => const DashboardScreen()),
        GoRoute(path: '/classes', builder: (_, __) => const ClassesScreen()),
        GoRoute(path: '/scan', builder: (_, __) => const ScanScreen()),
        GoRoute(path: '/alerts', builder: (_, __) => const AlertsScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      ],
    ),

    // Pushed detail routes
    GoRoute(path: '/classes/detail', builder: (_, state) => ClassDetailScreen(classAssignment: state.extra as ClassAssignment)),
    GoRoute(path: '/attendance', builder: (_, __) => const AttendanceScreen()),
    GoRoute(path: '/gradebook', builder: (_, __) => const GradebookScreen()),
    GoRoute(path: '/timetable', builder: (_, __) => const TimetableScreen()),

    GoRoute(path: '/assignments', builder: (_, __) => const ContentListScreen(type: 'assignments', title: 'Assignments')),
    GoRoute(path: '/assignments/homework', builder: (_, __) => const ContentListScreen(type: 'homework', title: 'Homework')),
    GoRoute(path: '/lesson-plans', builder: (_, __) => const ContentListScreen(type: 'lesson-plans', title: 'Lesson Plans')),
    GoRoute(path: '/lesson-plans/new', builder: (_, __) => const ContentEditorScreen(type: 'lesson-plans', title: 'Lesson Plan')),
    GoRoute(path: '/assignments/homework/new', builder: (_, __) => const ContentEditorScreen(type: 'homework', title: 'Homework')),
    GoRoute(path: '/schemes', builder: (_, __) => const ContentListScreen(type: 'schemes', title: 'Schemes of Work')),
    GoRoute(path: '/resources', builder: (_, __) => const ContentListScreen(type: 'resources', title: 'Resources')),

    GoRoute(path: '/messages', builder: (_, __) => const MessagingScreen()),
    GoRoute(path: '/leave', builder: (_, __) => const LeaveScreen()),
    GoRoute(path: '/behaviour', builder: (_, __) => const BehaviourScreen()),
    GoRoute(path: '/library', builder: (_, __) => const LibraryScreen()),
    GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
  ],
);
