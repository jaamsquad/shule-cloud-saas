import 'package:dio/dio.dart';
import '../core/constants/app_constants.dart';
import '../models/staff.dart';
import '../services/storage_service.dart';

class AuthResult {
  final Staff staff;
  const AuthResult(this.staff);
}

class AuthRepository {
  final Dio _dio;
  final StorageService _storage;
  AuthRepository(this._dio, this._storage);

  Future<AuthResult> login({required String schoolCode, required String username, required String password, bool rememberMe = true}) async {
    await _storage.saveSchoolCode(schoolCode);
    _storage.rememberMe = rememberMe;

    final res = await _dio.post(ApiConfig.staffLogin, data: {'username': username, 'password': password});
    final data = Map<String, dynamic>.from(res.data as Map);

    final token = data['token']?.toString();
    if (token != null) await _storage.saveTokens(access: token);

    final staffJson = Map<String, dynamic>.from((data['staff'] ?? {}) as Map);
    final staff = Staff.fromJson(staffJson);

    await _storage.saveJson(StorageKeys.staffProfile, staff.toJson());
    return AuthResult(staff);
  }

  Future<AuthResult?> tryAutoLogin() async {
    final token = await _storage.accessToken;
    if (token == null || !_storage.rememberMe) return null;
    final p = await _storage.readJson(StorageKeys.staffProfile);
    if (p == null) return null;
    return AuthResult(Staff.fromJson(Map<String, dynamic>.from(p as Map)));
  }

  /// Refresh the cached profile + permissions from the server (call after login
  /// and periodically) — the login response only carries a subset of fields.
  Future<Staff?> fetchMe() async {
    try {
      final res = await _dio.get(ApiConfig.me);
      final data = Map<String, dynamic>.from(res.data as Map);
      final staff = Staff.fromJson(data['staff'] != null ? Map<String, dynamic>.from(data['staff'] as Map) : data);
      await _storage.saveJson(StorageKeys.staffProfile, staff.toJson());
      return staff;
    } catch (_) {
      return null;
    }
  }

  /// Same contact-details update the web portal's "Edit Contact" dialog makes.
  Future<void> updateContact({required String email, required String phone}) =>
      _dio.patch(ApiConfig.profile, data: {'email': email, 'phone': phone});

  Future<void> logout() => _storage.clearAuth();
}
