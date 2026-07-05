import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../core/constants/app_constants.dart';
import '../models/driver.dart';

/// Wraps secure token storage + a Hive prefs box. Tokens live in the OS keystore;
/// non-sensitive prefs (dark mode, language) live in Hive.
class StorageService {
  final FlutterSecureStorage _secure;
  StorageService([FlutterSecureStorage? secure])
      : _secure = secure ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  Box get _prefs => Hive.box(StorageKeys.prefsBox);

  // ── Tokens ──────────────────────────────────────────────────────────────────
  Future<void> saveTokens({required String access, String? refresh}) async {
    await _secure.write(key: StorageKeys.accessToken, value: access);
    if (refresh != null) await _secure.write(key: StorageKeys.refreshToken, value: refresh);
  }

  Future<String?> get accessToken => _secure.read(key: StorageKeys.accessToken);
  Future<String?> get refreshToken => _secure.read(key: StorageKeys.refreshToken);

  Future<void> clearTokens() async {
    await _secure.delete(key: StorageKeys.accessToken);
    await _secure.delete(key: StorageKeys.refreshToken);
    await _secure.delete(key: StorageKeys.driverProfile);
    await _secure.delete(key: StorageKeys.schoolCode);
  }

  // ── School code (tenant subdomain) ──────────────────────────────────────────
  // Sent as the `x-tenant-subdomain` header on every request so the backend can
  // resolve the correct school database. This is the "School Code" from login.
  Future<void> saveSchoolCode(String code) => _secure.write(key: StorageKeys.schoolCode, value: code.trim().toLowerCase());
  Future<String?> get schoolCode => _secure.read(key: StorageKeys.schoolCode);

  // ── Driver profile (cached for auto-login/offline) ──────────────────────────
  Future<void> saveDriver(Driver d) => _secure.write(key: StorageKeys.driverProfile, value: jsonEncode(d.toJson()));

  Future<Driver?> get driver async {
    final raw = await _secure.read(key: StorageKeys.driverProfile);
    if (raw == null) return null;
    try {
      return Driver.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  // ── Prefs ───────────────────────────────────────────────────────────────────
  bool get darkMode => _prefs.get(StorageKeys.prefDarkMode, defaultValue: false) as bool;
  set darkMode(bool v) => _prefs.put(StorageKeys.prefDarkMode, v);

  String get language => _prefs.get(StorageKeys.prefLanguage, defaultValue: 'en') as String;
  set language(String v) => _prefs.put(StorageKeys.prefLanguage, v);

  bool get inspectionRequired => _prefs.get(StorageKeys.prefInspectionRequired, defaultValue: true) as bool;
  set inspectionRequired(bool v) => _prefs.put(StorageKeys.prefInspectionRequired, v);
}
