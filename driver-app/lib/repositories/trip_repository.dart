import 'package:dio/dio.dart';
import '../core/constants/app_constants.dart';
import '../models/route_stop.dart';
import '../models/trip.dart';

/// Trip lifecycle + today's route from the backend.
class TripRepository {
  final Dio _dio;
  TripRepository(this._dio);

  Future<BusRoute> todayRoute() async {
    final res = await _dio.get(ApiConfig.assignedRoute);
    return BusRoute.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<Trip> start(String routeId) async {
    final res = await _dio.post(ApiConfig.startTrip, data: {'routeId': routeId});
    return Trip.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<Trip> pause(String tripId) async {
    final res = await _dio.post(ApiConfig.pauseTrip, data: {'tripId': tripId});
    return Trip.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<Trip> resume(String tripId) async {
    final res = await _dio.post(ApiConfig.resumeTrip, data: {'tripId': tripId});
    return Trip.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<Trip> end(String tripId) async {
    final res = await _dio.post(ApiConfig.endTrip, data: {'tripId': tripId});
    return Trip.fromJson(Map<String, dynamic>.from(res.data as Map));
  }
}
