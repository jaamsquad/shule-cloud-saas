import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'config.dart';
import 'session.dart';

/// Dio for the signed-in person: their token + their school on every request.
final apiProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(baseUrl: AppConfig.apiBase, connectTimeout: const Duration(seconds: 20), receiveTimeout: const Duration(seconds: 30)));
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (o, h) {
      final s = ref.read(sessionProvider).valueOrNull;
      if (s != null) {
        o.headers['Authorization'] = 'Bearer ${s.tokenFor(o.path)}';
        o.headers['x-tenant-subdomain'] = s.subdomain;
      }
      h.next(o);
    },
  ));
  return dio;
});
