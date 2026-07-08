import 'package:dio/dio.dart';
import '../core/constants/app_constants.dart';
import 'storage_service.dart';

/// Dio configured with JWT + tenant header.
///
/// NOTE: unlike the parent-app, the backend's `/auth/staff-login` issues a
/// single plain 7-day JWT — there is no `/auth/refresh` endpoint for staff
/// tokens (confirmed against auth.routes.ts). So a 401 here means the token
/// genuinely expired/was revoked; the fix is to sign the user out and send them
/// back to Login, not to attempt a refresh call that doesn't exist server-side.
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
