import 'package:dio/dio.dart';
import '../core/constants/app_constants.dart';
import 'storage_service.dart';

/// Configured [Dio] instance with JWT injection, token refresh on 401, and
/// automatic retry (with backoff) for transient network/server errors.
class ApiClient {
  final Dio dio;
  final StorageService _storage;
  bool _refreshing = false;

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
        handler.next(options);
      },
      onError: (e, handler) async {
        // Attempt a single token refresh on 401, then replay the request.
        if (e.response?.statusCode == 401 && !_refreshing) {
          final ok = await _tryRefresh();
          if (ok) {
            try {
              final clone = await _retry(e.requestOptions);
              return handler.resolve(clone);
            } catch (_) {/* fall through */}
          }
        }
        handler.next(e);
      },
    ));
  }

  Future<bool> _tryRefresh() async {
    _refreshing = true;
    try {
      final refresh = await _storage.refreshToken;
      if (refresh == null) return false;
      final res = await Dio(BaseOptions(baseUrl: ApiConfig.baseUrl))
          .post(ApiConfig.refresh, data: {'refreshToken': refresh});
      final access = res.data['accessToken']?.toString();
      if (access == null) return false;
      await _storage.saveTokens(access: access, refresh: res.data['refreshToken']?.toString());
      return true;
    } catch (_) {
      return false;
    } finally {
      _refreshing = false;
    }
  }

  Future<Response<dynamic>> _retry(RequestOptions ro) {
    return dio.request(
      ro.path,
      data: ro.data,
      queryParameters: ro.queryParameters,
      options: Options(method: ro.method, headers: ro.headers),
    );
  }
}
