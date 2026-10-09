import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:google_sign_in/google_sign_in.dart';
import '../core/constants/app_constants.dart';

/// Google sign-in for the teacher app. The school platform owner sets the Google
/// OAuth Web client id in the owner portal; the app asks Google for an ID token for
/// that client (Android "server client id") and the server verifies it with Google.
class GoogleConfig {
  final bool enabled;
  final String clientId;
  const GoogleConfig(this.enabled, this.clientId);
}

class GoogleAuthException implements Exception {
  final String message;
  const GoogleAuthException(this.message);
  @override
  String toString() => message;
}

class GoogleAuthService {
  GoogleAuthService._();
  static GoogleSignIn? _client;
  static String? _clientFor;

  static Future<GoogleConfig> config(Dio dio) async {
    final res = await dio.get(ApiConfig.googleConfig);
    final m = Map<String, dynamic>.from(res.data as Map);
    final cfg = GoogleConfig(m['enabled'] == true, m['clientId']?.toString() ?? '');
    if (!cfg.enabled || cfg.clientId.isEmpty) {
      throw const GoogleAuthException('Google sign-in is not switched on yet. Use your Employee Number and password.');
    }
    return cfg;
  }

  static GoogleSignIn _signIn(String clientId) {
    if (_client == null || _clientFor != clientId) {
      _client = kIsWeb
          ? GoogleSignIn(clientId: clientId, scopes: const ['email'])
          : GoogleSignIn(serverClientId: clientId, scopes: const ['email']);
      _clientFor = clientId;
    }
    return _client!;
  }

  /// Opens the Google account picker and returns an ID token for [cfg].
  static Future<String> idToken(GoogleConfig cfg) async {
    final g = _signIn(cfg.clientId);
    await g.signOut().catchError((_) => null); // always let the teacher choose the account
    final account = await g.signIn();
    if (account == null) throw const GoogleAuthException('Google sign-in was cancelled.');
    final auth = await account.authentication;
    final token = auth.idToken;
    if (token == null || token.isEmpty) throw const GoogleAuthException('Google did not return a sign-in token. Try again.');
    return token;
  }

  static Future<void> signOut() async {
    try { await _client?.signOut(); } catch (_) {}
  }

  /// A friendly message from a Dio / Google error.
  static String messageOf(Object e) {
    if (e is GoogleAuthException) return e.message;
    if (e is DioException) {
      final d = e.response?.data;
      if (d is Map && d['message'] != null) return d['message'].toString();
      return 'Network error. Check your connection.';
    }
    return 'Google sign-in failed. Try again.';
  }
}
