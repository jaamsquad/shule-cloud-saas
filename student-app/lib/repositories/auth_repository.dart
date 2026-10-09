import 'package:dio/dio.dart';
import '../core/constants/app_constants.dart';
import '../models/models.dart';
import '../services/storage_service.dart';

class AuthRepository {
  final Dio _dio;
  final StorageService _storage;
  AuthRepository(this._dio, this._storage);

  Future<Student> login({required String schoolId, required String username, required String password, bool rememberMe = true}) async {
    // Persist the School ID FIRST so the tenant header is on the login call.
    await _storage.saveSchoolCode(schoolId);
    _storage.rememberMe = rememberMe;

    final res = await _dio.post(ApiConfig.studentLogin, data: {'username': username, 'password': password});
    final data = Map<String, dynamic>.from(res.data as Map);
    final token = data['token']?.toString();
    if (token != null) await _storage.saveTokens(access: token);

    final student = Student.fromJson(Map<String, dynamic>.from((data['student'] ?? {}) as Map));
    await _storage.saveJson(StorageKeys.studentProfile, student.toJson());
    return student;
  }

  Future<Student?> tryAutoLogin() async {
    final token = await _storage.accessToken;
    if (token == null || !_storage.rememberMe) return null;
    final p = await _storage.readJson(StorageKeys.studentProfile);
    if (p == null) return null;
    return Student.fromJson(Map<String, dynamic>.from(p as Map));
  }

  /// Full profile (the login response only carries a few fields).
  Future<Student?> fetchMe() async {
    try {
      final res = await _dio.get(ApiConfig.me);
      final student = Student.fromJson(Map<String, dynamic>.from(res.data as Map));
      await _storage.saveJson(StorageKeys.studentProfile, student.toJson());
      return student;
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() => _storage.clearAuth();
}
