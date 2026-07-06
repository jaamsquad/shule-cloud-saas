/// API endpoints + storage keys.
///
/// The ShuleCloud backend mounts routes at /api/v1 and resolves the tenant from
/// the subdomain OR the `x-tenant-subdomain` header (the "School Code" at login).
/// A parent's token carries a studentId; the student-portal endpoints return that
/// child's data. Multiple children are handled by re-logging per linked account
/// (or the parent-portal endpoints when available).
class ApiConfig {
  ApiConfig._();

  /// PROD: 'https://api.shulecloud.com/api/v1' (with x-tenant-subdomain header).
  /// Local emulator: 'http://10.0.2.2:5000/api/v1'.
  static const String baseUrl = 'https://api.shulecloud.com/api/v1';
  static const String socketUrl = 'https://api.shulecloud.com';

  // Auth
  static const String parentLogin = '/auth/parent-login';
  static const String smartLogin = '/auth/smart-login';

  // Selected-student data (student-portal endpoints, scoped by the parent token)
  static const String me = '/auth/student-portal/me';
  static const String summary = '/auth/student-portal/summary';
  static const String attendance = '/auth/student-portal/attendance';
  static const String examResults = '/auth/student-portal/exam-results';
  static const String marks = '/auth/student-portal/marks';
  static const String timetable = '/auth/student-portal/timetable';
  static const String feeInvoices = '/auth/student-portal/fee-invoices';
  static const String fees = '/auth/student-portal/fees';
  static const String payMpesa = '/auth/student-portal/pay-mpesa';
  static const String announcements = '/auth/student-portal/announcements';
  static const String calendar = '/auth/student-portal/academic-calendar';
  static const String library = '/auth/student-portal/library';

  // Homework / tasks: /tasks/:type  (homework | assignment)
  static String tasks(String type) => '/auth/student-portal/tasks/$type';

  // Live bus position for the student's transport zone.
  static const String busPosition = '/transport/live/buses';

  // Messaging + notifications (placeholder — falls back gracefully if absent).
  static const String messages = '/auth/student-portal/messages';
  static const String notifications = '/auth/student-portal/notifications';
}

class StorageKeys {
  StorageKeys._();
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String parentProfile = 'parent_profile';
  static const String students = 'students';
  static const String selectedStudentId = 'selected_student_id';
  static const String schoolCode = 'school_code';
  static const String rememberMe = 'remember_me';

  static const String prefsBox = 'prefs';
  static const String cacheBox = 'cache';
  static const String prefDarkMode = 'dark_mode';
  static const String prefLanguage = 'language';
  static const String prefBiometric = 'biometric_login';
}
