import 'package:dio/dio.dart';
import '../core/constants/app_constants.dart';
import '../core/error/failures.dart';
import '../core/utils/result.dart';
import '../models/driver.dart';
import '../services/storage_service.dart';

/// Authentication: login, auto-login, logout. Persists JWTs securely and caches
/// the driver profile for offline start-up.
class AuthRepository {
  final Dio _dio;
  final StorageService _storage;
  AuthRepository(this._dio, this._storage);

  Future<Result<Driver>> login({
    required String schoolCode,
    required String identifier,
    required String password,
  }) async {
    try {
      // Persist the school code FIRST so the tenant header is on the login call.
      await _storage.saveSchoolCode(schoolCode);
      final res = await _dio.post(ApiConfig.login, data: {
        'schoolCode': schoolCode,
        'identifier': identifier,
        'password': password,
      });
      final data = res.data as Map<String, dynamic>;
      await _storage.saveTokens(
        access: data['accessToken'].toString(),
        refresh: data['refreshToken']?.toString(),
      );
      final driver = Driver.fromJson(Map<String, dynamic>.from(data['driver'] as Map));
      await _storage.saveDriver(driver);
      return Success(driver);
    } on DioException catch (e) {
      return Err(_mapDioError(e));
    } catch (_) {
      return const Err(UnknownFailure());
    }
  }

  /// Returns the cached driver if a valid token exists (auto-login).
  Future<Driver?> tryAutoLogin() async {
    final token = await _storage.accessToken;
    if (token == null) return null;
    return _storage.driver;
  }

  Future<void> logout() => _storage.clearTokens();

  Failure _mapDioError(DioException e) {
    if (e.type == DioExceptionType.connectionError || e.type == DioExceptionType.connectionTimeout) {
      return const NetworkFailure();
    }
    final code = e.response?.statusCode;
    if (code == 401 || code == 403) return const AuthFailure('Invalid credentials. Check your School ID, Driver ID and password.');
    if (code != null && code >= 500) return const ServerFailure();
    final msg = e.response?.data is Map ? (e.response?.data['message']?.toString()) : null;
    return ValidationFailure(msg ?? 'Login failed. Please try again.');
  }
}
