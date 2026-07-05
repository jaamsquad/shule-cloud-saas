import 'package:hive/hive.dart';

part 'gps_point.g.dart';

/// A single GPS sample. Stored in Hive when offline so nothing is ever lost, and
/// serialized to the tracker endpoint. Run `flutter pub run build_runner build`
/// to (re)generate the Hive adapter in `gps_point.g.dart`.
@HiveType(typeId: 1)
class GpsPoint {
  @HiveField(0)
  final double latitude;
  @HiveField(1)
  final double longitude;
  @HiveField(2)
  final double speed; // m/s
  @HiveField(3)
  final double heading;
  @HiveField(4)
  final double accuracy;
  @HiveField(5)
  final double altitude;
  @HiveField(6)
  final int timestamp; // epoch ms
  @HiveField(7)
  final int battery; // 0-100
  @HiveField(8)
  final String driverId;
  @HiveField(9)
  final String busId;
  @HiveField(10)
  final String tripId;

  const GpsPoint({
    required this.latitude,
    required this.longitude,
    required this.speed,
    required this.heading,
    required this.accuracy,
    required this.altitude,
    required this.timestamp,
    required this.battery,
    required this.driverId,
    required this.busId,
    required this.tripId,
  });

  Map<String, dynamic> toJson() => {
        'lat': latitude,
        'lng': longitude,
        'speed': speed,
        'heading': heading,
        'accuracy': accuracy,
        'altitude': altitude,
        'timestamp': timestamp,
        'battery': battery,
        'driverId': driverId,
        'busId': busId,
        'tripId': tripId,
      };
}
