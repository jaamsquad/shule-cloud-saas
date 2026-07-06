import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Local notifications + optional FCM. Firebase is OPTIONAL: without a
/// google-services.json the Firebase app never initialises, so any call to
/// FirebaseMessaging.instance throws. Everything here is guarded so the app runs
/// perfectly fine with no push configured. (This was the driver-app splash-hang.)
class NotificationService {
  final FlutterLocalNotificationsPlugin _local = FlutterLocalNotificationsPlugin();

  static const _channel = AndroidNotificationChannel(
    'shulecloud_parent',
    'ShuleCloud Parent',
    description: 'Attendance, fees, homework, transport & school updates',
    importance: Importance.high,
  );

  Future<void> init() async {
    await _local.initialize(const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    ));
    final android = _local.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await android?.createNotificationChannel(_channel);
    await android?.requestNotificationsPermission();

    try {
      await FirebaseMessaging.instance.requestPermission();
      FirebaseMessaging.onMessage.listen(_showForeground);
    } catch (e) {
      debugPrint('FCM not configured — skipping push: $e');
    }
  }

  Future<String?> get fcmToken async {
    try {
      return await FirebaseMessaging.instance.getToken();
    } catch (_) {
      return null;
    }
  }

  void _showForeground(RemoteMessage m) {
    final n = m.notification;
    if (n == null) return;
    _local.show(
      n.hashCode,
      n.title,
      n.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: const DarwinNotificationDetails(),
      ),
    );
  }
}
