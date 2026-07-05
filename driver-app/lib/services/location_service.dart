import 'package:geolocator/geolocator.dart';
import 'package:battery_plus/battery_plus.dart';
import '../core/constants/app_constants.dart';
import '../models/gps_point.dart';

/// Thin wrapper over Geolocator + Battery for producing [GpsPoint]s.
class LocationService {
  final Battery _battery = Battery();

  /// Ensures location services are on and foreground+background permission is
  /// granted. Returns true when we may track.
  Future<bool> ensurePermissions() async {
    if (!await Geolocator.isLocationServiceEnabled()) return false;
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.deniedForever || perm == LocationPermission.denied) {
      return false;
    }
    return true;
  }

  /// A throttled position stream (distance-filtered per [TrackingConfig]).
  Stream<Position> positionStream() => Geolocator.getPositionStream(
        locationSettings: LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: TrackingConfig.distanceFilterMeters,
        ),
      );

  Future<Position> current() => Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

  /// Build a [GpsPoint] from a raw [Position] + current trip/driver/bus ids.
  Future<GpsPoint> toPoint(
    Position p, {
    required String driverId,
    required String busId,
    required String tripId,
  }) async {
    final level = await _battery.batteryLevel;
    return GpsPoint(
      latitude: p.latitude,
      longitude: p.longitude,
      speed: p.speed,
      heading: p.heading,
      accuracy: p.accuracy,
      altitude: p.altitude,
      timestamp: DateTime.now().millisecondsSinceEpoch,
      battery: level,
      driverId: driverId,
      busId: busId,
      tripId: tripId,
    );
  }
}
