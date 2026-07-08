import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../core/constants/app_constants.dart';

/// Secure tokens/profile (OS keystore) + a Hive prefs box + a small JSON cache
/// for offline support.
class StorageService {
  final FlutterSecureStorage _secure;
  StorageService([FlutterSecureStorage? secure])
      : _secure = secure ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  Box get _prefs => Hive.box(StorageKeys.prefsBox);
  Box get _cache => Hive.box(StorageKeys.cacheBox);

  // ── Tokens ──────────────────────────────────────────────────────────────────
  Future<void> saveTokens({required String access, String? refresh}) async {
    await _secure.write(key: StorageKeys.accessToken, value: access);
    if (refresh != null) await _secure.write(key: StorageKeys.refreshToken, value: refresh);
  }

  Future<String?> get accessToken => _secure.read(key: StorageKeys.accessToken);
  Future<String?> get refreshToken => _secure.read(key: StorageKeys.refreshToken);

  Future<void> clearAuth() async {
    await _secure.delete(key: StorageKeys.accessToken);
    await _secure.delete(key: StorageKeys.refreshToken);
    await _secure.delete(key: StorageKeys.staffProfile);
  }

  // ── School code (tenant subdomain) ──────────────────────────────────────────
  Future<void> saveSchoolCode(String code) => _secure.write(key: StorageKeys.schoolCode, value: code.trim().toLowerCase());
  Future<String?> get schoolCode => _secure.read(key: StorageKeys.schoolCode);

  // ── Staff profile (cached for auto-login/offline) ───────────────────────────
  Future<void> saveJson(String key, Object value) => _secure.write(key: key, value: jsonEncode(value));
  Future<dynamic> readJson(String key) async {
    final raw = await _secure.read(key: key);
    if (raw == null) return null;
    try { return jsonDecode(raw); } catch (_) { return null; }
  }

  // ── Offline JSON cache (Hive) ───────────────────────────────────────────────
  Future<void> cache(String key, Object value) async => _cache.put(key, jsonEncode(value));
  dynamic readCache(String key) {
    final raw = _cache.get(key);
    if (raw == null) return null;
    try { return jsonDecode(raw as String); } catch (_) { return null; }
  }

  // ── Prefs ───────────────────────────────────────────────────────────────────
  bool get darkMode => _prefs.get(StorageKeys.prefDarkMode, defaultValue: false) as bool;
  set darkMode(bool v) => _prefs.put(StorageKeys.prefDarkMode, v);

  String get language => _prefs.get(StorageKeys.prefLanguage, defaultValue: 'en') as String;
  set language(String v) => _prefs.put(StorageKeys.prefLanguage, v);

  bool get biometric => _prefs.get(StorageKeys.prefBiometric, defaultValue: false) as bool;
  set biometric(bool v) => _prefs.put(StorageKeys.prefBiometric, v);

  bool get rememberMe => _prefs.get(StorageKeys.rememberMe, defaultValue: true) as bool;
  set rememberMe(bool v) => _prefs.put(StorageKeys.rememberMe, v);
}
