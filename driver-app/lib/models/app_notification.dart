enum NotifKind { emergency, route, schedule, message, announcement }

/// A notification shown on the Alerts screen (also arrives via FCM).
class AppNotification {
  final String id;
  final NotifKind kind;
  final String title;
  final String body;
  final DateTime createdAt;
  final bool read;

  const AppNotification({
    required this.id,
    required this.kind,
    required this.title,
    required this.body,
    required this.createdAt,
    this.read = false,
  });

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: (j['id'] ?? j['_id'] ?? '').toString(),
        kind: switch ((j['kind'] ?? j['type'] ?? '').toString().toLowerCase()) {
          'emergency' => NotifKind.emergency,
          'route' => NotifKind.route,
          'schedule' => NotifKind.schedule,
          'message' => NotifKind.message,
          _ => NotifKind.announcement,
        },
        title: (j['title'] ?? '').toString(),
        body: (j['body'] ?? j['message'] ?? '').toString(),
        createdAt: DateTime.tryParse(j['createdAt']?.toString() ?? '') ?? DateTime.now(),
        read: j['read'] == true,
      );
}
