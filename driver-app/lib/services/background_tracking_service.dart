import 'dart:async';
import 'dart:ui';
import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service_android/flutter_background_service_android.dart';
import 'package:geolocator/geolocator.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../core/constants/app_constants.dart';
import '../models/gps_point.dart';
import 'gps_queue.dart';
import 'storage_service.dart';
import 'tracking_uploader.dart';

/// Foreground background service that keeps sampling GPS and pushing it to the
/// backend while the screen is locked, the app is minimised, or another app is
/// open. It runs until `stopTracking()` (End Trip / logout) is called.
class BackgroundTrackingService {
  static final _service = FlutterBackgroundService();

  /// One-time configuration. Call from `main()` before `runApp`.
  static Future<void> init() async {
    await _service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: _onStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: 'shulecloud_tracking',
        initialNotificationTitle: 'ShuleCloud Driver',
        initialNotificationContent: 'Live trip tracking active',
        foregroundServiceNotificationId: 8801,
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: _onStart,
      ),
    );
  }

  /// Begin tracking for a trip. The ids are handed to the isolate via invoke().
  static Future<void> startTracking({
    required String driverId,
    required String busId,
    required String tripId,
  }) async {
    await _service.startService();
    _service.invoke('config', {'driverId': driverId, 'busId': busId, 'tripId': tripId});
  }

  static Future<void> stopTracking() async => _service.invoke('stop');

  static Future<bool> isRunning() => _service.isRunning();
}

/// Entry point that runs inside the background isolate.
@pragma('vm:entry-point')
Future<void> _onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  await Hive.initFlutter();
  if (!Hive.isAdapterRegistered(1)) Hive.registerAdapter(GpsPointAdapter());
  await Hive.openBox<GpsPoint>(StorageKeys.gpsQueueBox);

  final storage = StorageService();
  final dio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));
  final token = await storage.accessToken;
  if (token != null) dio.options.headers['Authorization'] = 'Bearer $token';
  final uploader = TrackingUploader(dio, GpsQueue());

  String driverId = '', busId = '', tripId = '';
  StreamSubscription<Position>? sub;

  service.on('config').listen((data) {
    driverId = data?['driverId'] ?? '';
    busId = data?['busId'] ?? '';
    tripId = data?['tripId'] ?? '';
  });

  service.on('stop').listen((_) async {
    await sub?.cancel();
    await service.stopSelf();
  });

  // Distance-filtered stream keeps battery use low while staying responsive.
  sub = Geolocator.getPositionStream(
    locationSettings: const LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: TrackingConfig.distanceFilterMeters,
    ),
  ).listen((pos) async {
    if (tripId.isEmpty) return;
    final point = GpsPoint(
      latitude: pos.latitude,
      longitude: pos.longitude,
      speed: pos.speed,
      heading: pos.heading,
      accuracy: pos.accuracy,
      altitude: pos.altitude,
      timestamp: DateTime.now().millisecondsSinceEpoch,
      battery: 0,
      driverId: driverId,
      busId: busId,
      tripId: tripId,
    );
    await uploader.submit(point);

    if (service is AndroidServiceInstance) {
      service.setForegroundNotificationInfo(
        title: 'ShuleCloud Driver — Trip Active',
        content: 'Sharing live location · ${DateTime.now().toString().substring(11, 19)}',
      );
    }
  });
}
