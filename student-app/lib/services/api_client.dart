import 'package:dio/dio.dart';
import '../core/constants/app_constants.dart';
import 'storage_service.dart';

/// Dio configured with JWT + tenant header.
///
/// `/auth/student-login` issues a single plain 7-day JWT and there is no
/// refresh endpoint, so a 401 means the token expired or was revoked: sign the
/// student out and send them back to Login.
class ApiClient {
  final Dio dio;
  final StorageService _storage;
  void Function()? onUnauthorized;

  ApiClient(this._storage)
      : dio = Dio(BaseOptions(
          baseUrl: ApiConfig.baseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 20),
          headers: {'Content-Type': 'application/json'},
        )) {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.accessToken;
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        final school = await _storage.schoolCode;
        if (school != null && school.isNotEmpty) options.headers['x-tenant-subdomain'] = school;
        handler.next(options);
      },
      onError: (e, handler) async {
        if (e.response?.statusCode == 401) {
          await _storage.clearAuth();
          onUnauthorized?.call();
        }
        handler.next(e);
      },
    ));
  }
}
