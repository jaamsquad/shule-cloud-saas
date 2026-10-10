/// Where the app talks to. Override at build time:
///   flutter build apk --dart-define=API_BASE=https://api.example.com/api/v1 --dart-define=WEB_DOMAIN=example.com
class AppConfig {
  AppConfig._();
  static const String apiBase = String.fromEnvironment('API_BASE', defaultValue: 'https://api.shulecloud.com/api/v1');

  /// Schools live at https://<school>.<webDomain> — pages not built natively open there, signed in.
  static const String webDomain = String.fromEnvironment('WEB_DOMAIN', defaultValue: 'shulecloud.com');

  static Uri schoolWeb(String subdomain, [String path = '/']) => Uri.parse('https://$subdomain.$webDomain$path');

  static const String supportPhone = '0726151104';
  static const String supportEmail = 'support@shulecloud.com';
}
