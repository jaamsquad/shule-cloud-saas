/// App-wide constants: API endpoints, storage keys, and tunables.
///
/// Replace [baseUrl] with your deployed ShuleCloud backend. The tracker endpoint
/// matches the spec (`POST /api/tracker/location`); other paths are placeholders
/// aligned with the existing Node backend where possible.
class ApiConfig {
  ApiConfig._();

  /// Base URL of the ShuleCloud backend. Routes are mounted at /api/v1 and the
  /// tenant (school) is resolved from the subdomain OR the `x-tenant-subdomain`
  /// header (see ApiClient) — that header is the "School Code" from login.
  ///
  /// PROD example: 'https://api.shulecloud.com/api/v1' (with subdomain header),
  /// or 'https://<school>.shulecloud.com/api/v1'.
  /// LOCAL dev on an Android emulator: 'http://10.0.2.2:5000/api/v1'.
  static const String baseUrl = 'https://api.shulecloud.com/api/v1';

  // ── Auth ──────────────────────────────────────────────────────────────────
  static const String login = '/driver/login';
  static const String refresh = '/driver/refresh';
  static const String me = '/driver/me';

  // ── Trip lifecycle ─────────────────────────────────────────────────────────
  static const String assignedRoute = '/driver/route/today';
  static const String startTrip = '/driver/trip/start';
  static const String pauseTrip = '/driver/trip/pause';
  static const String resumeTrip = '/driver/trip/resume';
  static const String endTrip = '/driver/trip/end';

  // ── Live tracking ───────────────────────────────────────────────────────────
  static const String trackerLocation = '/tracker/location';
  static const String trackerBatch = '/tracker/location/batch';

  // ── Students & boarding ─────────────────────────────────────────────────────
  static const String routeStudents = '/driver/students';
  static const String boardStudent = '/driver/students/board';
  static const String dropStudent = '/driver/students/drop';
  static const String studentByQr = '/driver/students/scan';

  // ── Safety & ops ────────────────────────────────────────────────────────────
  static const String sos = '/driver/sos';
  static const String incident = '/driver/incident';
  static const String inspection = '/driver/inspection';
  static const String notifications = '/driver/notifications';

  /// Socket.IO namespace for live driver events.
  static const String socketUrl = baseUrl;
}

/// Keys for [FlutterSecureStorage] and Hive boxes.
class StorageKeys {
  StorageKeys._();
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String driverProfile = 'driver_profile';
  static const String schoolCode = 'school_code';

  static const String gpsQueueBox = 'gps_queue';
  static const String prefsBox = 'prefs';
  static const String prefDarkMode = 'dark_mode';
  static const String prefLanguage = 'language';
  static const String prefInspectionRequired = 'inspection_required';
  // 'scan' = board/drop by scanning a card; 'list' = pick from the student list.
  static const String prefBoardingMode = 'boarding_mode';
}

/// Tracking tunables (spec: every 5–10s or 20–50m).
class TrackingConfig {
  TrackingConfig._();
  static const Duration interval = Duration(seconds: 8);
  static const int distanceFilterMeters = 25;
  static const int batchFlushSize = 20;
  static const Duration retryBackoff = Duration(seconds: 15);
}
