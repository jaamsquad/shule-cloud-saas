/// App-wide constants: API endpoints, storage keys, and tunables.
///
/// Replace [baseUrl] with your deployed ShuleCloud backend. The tracker endpoint
/// matches the spec (`POST /api/tracker/location`); other paths are placeholders
/// aligned with the existing Node backend where possible.
class ApiConfig {
  ApiConfig._();

  /// Base URL of the ShuleCloud backend (HTTPS only in production).
  static const String baseUrl = 'https://api.shulecloud.com';

  // ── Auth ──────────────────────────────────────────────────────────────────
  static const String login = '/api/driver/login';
  static const String refresh = '/api/driver/refresh';
  static const String me = '/api/driver/me';

  // ── Trip lifecycle ─────────────────────────────────────────────────────────
  static const String assignedRoute = '/api/driver/route/today';
  static const String startTrip = '/api/driver/trip/start';
  static const String pauseTrip = '/api/driver/trip/pause';
  static const String resumeTrip = '/api/driver/trip/resume';
  static const String endTrip = '/api/driver/trip/end';

  // ── Live tracking ───────────────────────────────────────────────────────────
  static const String trackerLocation = '/api/tracker/location';
  static const String trackerBatch = '/api/tracker/location/batch';

  // ── Students & boarding ─────────────────────────────────────────────────────
  static const String routeStudents = '/api/driver/students';
  static const String boardStudent = '/api/driver/students/board';
  static const String dropStudent = '/api/driver/students/drop';
  static const String studentByQr = '/api/driver/students/scan';

  // ── Safety & ops ────────────────────────────────────────────────────────────
  static const String sos = '/api/driver/sos';
  static const String incident = '/api/driver/incident';
  static const String inspection = '/api/driver/inspection';
  static const String notifications = '/api/driver/notifications';

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
}

/// Tracking tunables (spec: every 5–10s or 20–50m).
class TrackingConfig {
  TrackingConfig._();
  static const Duration interval = Duration(seconds: 8);
  static const int distanceFilterMeters = 25;
  static const int batchFlushSize = 20;
  static const Duration retryBackoff = Duration(seconds: 15);
}
