import 'package:dio/dio.dart';
import '../core/constants/app_constants.dart';
import '../models/parent.dart';
import '../models/student.dart';
import '../services/storage_service.dart';

/// Login result: the parent + their linked children.
class AuthResult {
  final Parent parent;
  final List<Student> students;
  const AuthResult(this.parent, this.students);
}

class AuthRepository {
  final Dio _dio;
  final StorageService _storage;
  AuthRepository(this._dio, this._storage);

  /// Parent login. Persists the school code FIRST so the tenant header is on the
  /// login call itself.
  Future<AuthResult> login({
    required String schoolCode,
    required String identifier,
    required String password,
    bool rememberMe = true,
  }) async {
    await _storage.saveSchoolCode(schoolCode);
    _storage.rememberMe = rememberMe;

    final res = await _dio.post(ApiConfig.parentLogin, data: {
      'schoolCode': schoolCode,
      'username': identifier,
      'identifier': identifier,
      'password': password,
    });
    final data = Map<String, dynamic>.from(res.data as Map);

    final token = (data['token'] ?? data['accessToken'])?.toString();
    if (token != null) {
      await _storage.saveTokens(access: token, refresh: data['refreshToken']?.toString());
    }

    // The backend returns either { parent: {...} } or a flat parent object,
    // and either a students[] array or a single student.
    final parentJson = Map<String, dynamic>.from((data['parent'] ?? data) as Map);
    final parent = Parent.fromJson(parentJson);

    final rawStudents = data['students'] ?? parentJson['students'] ??
        (parentJson['student'] != null ? [parentJson['student']] : []);
    final students = (rawStudents as List)
        .map((e) => Student.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();

    await _storage.saveJson(StorageKeys.parentProfile, parent.toJson());
    await _storage.saveJson(StorageKeys.students, students.map((s) => s.toJson()).toList());
    if (students.isNotEmpty) await _storage.saveSelectedStudentId(students.first.id);

    return AuthResult(parent, students);
  }

  /// Auto-login from cached profile (no network) when a token exists.
  Future<AuthResult?> tryAutoLogin() async {
    final token = await _storage.accessToken;
    if (token == null || !_storage.rememberMe) return null;
    final p = await _storage.readJson(StorageKeys.parentProfile);
    final s = await _storage.readJson(StorageKeys.students);
    if (p == null) return null;
    final parent = Parent.fromJson(Map<String, dynamic>.from(p as Map));
    final students = ((s as List?) ?? [])
        .map((e) => Student.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
    return AuthResult(parent, students);
  }

  Future<void> logout() => _storage.clearAuth();
}
