/// API endpoints + storage keys.
///
/// The ShuleCloud backend mounts routes at /api/v1 and resolves the school from
/// the `x-tenant-subdomain` header, which carries the School ID typed at login
/// (e.g. A482917M). Student auth is a 7-day JWT from `/auth/student-login`;
/// everything a student can call lives under `/auth/student-portal/*`.
class ApiConfig {
  ApiConfig._();

  /// PROD: 'https://api.shulecloud.com/api/v1'.
  /// Local emulator: 'http://10.0.2.2:5000/api/v1'.
  static const String baseUrl = 'https://api.shulecloud.com/api/v1';

  // Auth
  static const String studentLogin = '/auth/student-login';
  static const String me = '/auth/student-portal/me';

  // Dashboard
  static const String summary = '/auth/student-portal/summary';
  static const String academicCalendar = '/auth/student-portal/academic-calendar';

  // Academics
  static const String examResults = '/auth/student-portal/exam-results';
  static const String timetable = '/auth/student-portal/timetable';
  static String tasks(String type) => '/auth/student-portal/tasks/$type'; // assignment | homework
  static String submitTask(String type, String id) => '/auth/student-portal/tasks/$type/$id/submit';
  static const String resources = '/auth/student-portal/resources';

  // Fees
  static const String fees = '/auth/student-portal/fees';
  static const String payMpesa = '/auth/student-portal/pay-mpesa';
  static const String mpesaStatus = '/auth/student-portal/mpesa-status';
  static const String receipts = '/auth/student-portal/receipts';

  // Wallet
  static const String wallet = '/auth/student-portal/wallet';
  static const String walletTopup = '/auth/student-portal/wallet/topup';
  static const String walletPayFees = '/auth/student-portal/wallet/pay-fees';
}

class StorageKeys {
  StorageKeys._();
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String studentProfile = 'student_profile';
  static const String schoolCode = 'school_code';
  static const String rememberMe = 'remember_me';

  static const String prefsBox = 'prefs';
  static const String cacheBox = 'cache';
  static const String prefDarkMode = 'dark_mode';
  static const String prefLanguage = 'language';
  static const String prefBiometric = 'biometric_login';
}
