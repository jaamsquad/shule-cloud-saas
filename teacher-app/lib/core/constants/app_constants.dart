/// API endpoints + storage keys.
///
/// The ShuleCloud backend mounts routes at /api/v1 and resolves the tenant from
/// the subdomain OR the `x-tenant-subdomain` header (the "School Code" at login).
/// Teacher auth is a single 7-day JWT (staffId claim) against `/auth/staff-login`
/// — the whole surface a teacher can call lives under `/auth/staff-portal/*`.
class ApiConfig {
  ApiConfig._();

  /// PROD: 'https://api.shulecloud.com/api/v1' (with x-tenant-subdomain header).
  /// Local emulator: 'http://10.0.2.2:5000/api/v1'.
  static const String baseUrl = 'https://api.shulecloud.com/api/v1';
  static const String socketUrl = 'https://api.shulecloud.com';

  // Auth
  static const String staffLogin = '/auth/staff-login';
  static const String me = '/auth/staff-portal/me';
  static const String profile = '/auth/staff-portal/profile';
  static const String permissions = '/auth/staff-portal/permissions';

  // Continue with Google (the owner sets the Google client id in the owner portal)
  static const String googleConfig = '/auth/google/config';
  static const String googleLogin = '/auth/google/login';
  static const String googleLink = '/auth/google/link';
  static const String googleUnlink = '/auth/google/unlink';
  static const String accountSecurity = '/auth/account-security';

  // Dashboard
  static const String summary = '/auth/staff-portal/summary';
  static const String announcements = '/auth/staff-portal/announcements';
  static const String liveMeetings = '/auth/staff-portal/live-meetings';

  // Classes / students
  static const String myClasses = '/auth/staff-portal/my-classes';
  static const String assignmentsScope = '/auth/staff-portal/assignments'; // (class, subject) pairs this teacher teaches

  // Timetable
  static const String timetable = '/auth/staff-portal/timetable';

  // Attendance
  static const String attendance = '/auth/staff-portal/attendance';
  static const String myAttendance = '/auth/staff-portal/my-attendance';

  // Exams / marks / gradebook
  static const String exams = '/auth/staff-portal/exams';
  static const String roster = '/auth/staff-portal/roster';
  static const String marks = '/auth/staff-portal/marks';
  static const String marksStatus = '/auth/staff-portal/marks-status';
  static const String marksSubmit = '/auth/staff-portal/marks/submit';
  static const String results = '/auth/staff-portal/results';

  // CBC
  static const String cbcScope = '/auth/staff-portal/cbc/scope';
  static const String cbcActivities = '/auth/staff-portal/cbc/activities';
  static const String cbcRoster = '/auth/staff-portal/cbc/roster';
  static const String cbcAssess = '/auth/staff-portal/cbc/assess';

  // Content: lesson-plans | schemes | resources | assignments | homework
  static String content(String type) => '/auth/staff-portal/content/$type';
  static String contentItem(String type, String id) => '/auth/staff-portal/content/$type/$id';
  static String submissions(String type, String id) => '/auth/staff-portal/content/$type/$id/submissions';
  static String gradeSubmission(String id) => '/auth/staff-portal/submissions/$id/grade';
  static const String resources = '/auth/staff-portal/resources';

  // Messaging (teacher → parent, scoped to own classes)
  static const String messageParentsStudents = '/auth/staff-portal/message-parents/students';
  static const String messageParents = '/auth/staff-portal/message-parents';
  static const String messageParentsHistory = '/auth/staff-portal/message-parents/history';

  // Leave
  static const String leaveRequests = '/auth/staff-portal/leave-requests';

  // Module dashboards (permission-gated)
  static String moduleSummary(String key) => '/auth/staff-portal/module/$key/summary';
  static const String financeSummary = '/auth/staff-portal/finance/summary';

  // Behaviour + Library + Calendar — NOT under /auth, and NOT staff-scoped by the
  // backend (tenancy-header only, no per-teacher ownership check server-side).
  // Used read-mostly / with caution until the backend adds a scoped proxy.
  static const String behaviourTraits = '/behaviour-traits';
  static const String behaviourRatings = '/behaviour-ratings';
  static const String behaviourRatingsBulk = '/behaviour-ratings/bulk';
  static const String observations = '/observations';
  static const String observationsBulk = '/observations/bulk';
  static const String observationPhrases = '/observation-phrases';
  static const String libraryBooks = '/library/books';
  static const String libraryIssues = '/library/issues';
  static String libraryReturn(String id) => '/library/issues/$id/return';
  static const String libraryOverdue = '/library/overdue';
  static const String calendarEvents = '/calendar/events';
}

class StorageKeys {
  StorageKeys._();
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String staffProfile = 'staff_profile';
  static const String schoolCode = 'school_code';
  static const String rememberMe = 'remember_me';

  static const String prefsBox = 'prefs';
  static const String cacheBox = 'cache';
  static const String prefDarkMode = 'dark_mode';
  static const String prefLanguage = 'language';
  static const String prefBiometric = 'biometric_login';
}
