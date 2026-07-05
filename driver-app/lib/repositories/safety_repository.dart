import 'package:dio/dio.dart';
import '../core/constants/app_constants.dart';
import '../models/app_notification.dart';

/// SOS, incident reports, inspections, and notifications.
class SafetyRepository {
  final Dio _dio;
  SafetyRepository(this._dio);

  Future<void> sendSos({
    required double lat,
    required double lng,
    String? tripId,
  }) =>
      _dio.post(ApiConfig.sos, data: {
        'lat': lat,
        'lng': lng,
        'tripId': tripId,
        'timestamp': DateTime.now().toIso8601String(),
      });

  Future<void> reportIncident({
    required String type,
    required String description,
    double? lat,
    double? lng,
    String? photoBase64,
  }) =>
      _dio.post(ApiConfig.incident, data: {
        'type': type,
        'description': description,
        'lat': lat,
        'lng': lng,
        'photo': photoBase64,
        'timestamp': DateTime.now().toIso8601String(),
      });

  Future<void> submitInspection(Map<String, bool> checks) =>
      _dio.post(ApiConfig.inspection, data: {'checks': checks, 'at': DateTime.now().toIso8601String()});

  Future<List<AppNotification>> notifications() async {
    final res = await _dio.get(ApiConfig.notifications);
    final list = (res.data as List?) ?? [];
    return list.map((e) => AppNotification.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }
}
