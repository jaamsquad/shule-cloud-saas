enum StopStatus { completed, current, pending }

/// A stop on today's route.
class RouteStop {
  final String id;
  final String name;
  final double? lat;
  final double? lng;
  final double? fee;
  final String scheduledTime;
  final int studentCount;
  final StopStatus status;

  const RouteStop({
    required this.id,
    required this.name,
    this.lat,
    this.lng,
    this.fee,
    required this.scheduledTime,
    required this.studentCount,
    this.status = StopStatus.pending,
  });

  factory RouteStop.fromJson(Map<String, dynamic> j) => RouteStop(
        id: (j['id'] ?? j['_id'] ?? '').toString(),
        name: (j['name'] ?? 'Stop').toString(),
        lat: (j['lat'] as num?)?.toDouble(),
        lng: (j['lng'] as num?)?.toDouble(),
        fee: (j['fee'] as num?)?.toDouble(),
        scheduledTime: (j['scheduledTime'] ?? j['time'] ?? '').toString(),
        studentCount: (j['studentCount'] as num?)?.toInt() ?? 0,
        status: switch ((j['status'] ?? '').toString().toLowerCase()) {
          'completed' => StopStatus.completed,
          'current' => StopStatus.current,
          _ => StopStatus.pending,
        },
      );
}

/// Today's assigned route: bus, label, and ordered stops.
class BusRoute {
  final String id;
  final String name;
  final String busPlate;
  final double? schoolLat;
  final double? schoolLng;
  final List<RouteStop> stops;

  const BusRoute({
    required this.id,
    required this.name,
    required this.busPlate,
    this.schoolLat,
    this.schoolLng,
    this.stops = const [],
  });

  factory BusRoute.fromJson(Map<String, dynamic> j) => BusRoute(
        id: (j['id'] ?? j['_id'] ?? '').toString(),
        name: (j['name'] ?? 'Route').toString(),
        busPlate: (j['busPlate'] ?? j['busNumber'] ?? 'Bus').toString(),
        schoolLat: (j['schoolLat'] as num?)?.toDouble(),
        schoolLng: (j['schoolLng'] as num?)?.toDouble(),
        stops: ((j['stops'] as List?) ?? [])
            .map((e) => RouteStop.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
      );
}
