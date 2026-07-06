import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Firebase Cloud Messaging + local notifications. Foreground pushes are shown
/// as local notifications; the FCM token can be registered with the backend.
class NotificationService {
  final FlutterLocalNotificationsPlugin _local = FlutterLocalNotificationsPlugin();

  static const _channel = AndroidNotificationChannel(
    'shulecloud_alerts',
    'ShuleCloud Alerts',
    description: 'Route updates, messages and emergency alerts',
    importance: Importance.high,
  );

  // MUST match BackgroundTrackingService's notificationChannelId. The foreground
  // tracking service crashes natively on Android 8+ if this channel is missing.
  static const _trackingChannel = AndroidNotificationChannel(
    'shulecloud_tracking',
    'Live Trip Tracking',
    description: 'Ongoing notification while a trip is being tracked',
    importance: Importance.low, // low = quiet ongoing notification
  );

  Future<void> init() async {
    await _local.initialize(const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    ));
    final android = _local
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await android?.createNotificationChannel(_channel);
    await android?.createNotificationChannel(_trackingChannel);
    // Android 13+ needs runtime notification permission for the foreground service.
    await android?.requestNotificationsPermission();

    // Firebase Cloud Messaging is OPTIONAL: without google-services.json the
    // Firebase app never initialized, so touching FirebaseMessaging throws.
    // Guard it so the app runs perfectly fine without push configured.
    try {
      await FirebaseMessaging.instance.requestPermission();
      FirebaseMessaging.onMessage.listen(_showForeground);
    } catch (e) {
      debugPrint('FCM not configured — skipping push setup: $e');
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
