/// Trip lifecycle states. Transitions are enforced by the trip provider.
enum TripState { notStarted, started, paused, completed }

extension TripStateX on TripState {
  String get label => switch (this) {
        TripState.notStarted => 'Not Started',
        TripState.started => 'Active',
        TripState.paused => 'Paused',
        TripState.completed => 'Completed',
      };

  bool get isRunning => this == TripState.started;
}

/// An in-progress or completed trip.
class Trip {
  final String id;
  final String routeId;
  final String routeName;
  final TripState state;
  final DateTime? startedAt;
  final DateTime? endedAt;
  final double distanceMeters;

  const Trip({
    required this.id,
    required this.routeId,
    required this.routeName,
    this.state = TripState.notStarted,
    this.startedAt,
    this.endedAt,
    this.distanceMeters = 0,
  });

  factory Trip.fromJson(Map<String, dynamic> j) => Trip(
        id: (j['id'] ?? j['_id'] ?? '').toString(),
        routeId: (j['routeId'] ?? '').toString(),
        routeName: (j['routeName'] ?? '').toString(),
        state: switch ((j['state'] ?? '').toString().toLowerCase()) {
          'started' || 'active' => TripState.started,
          'paused' => TripState.paused,
          'completed' || 'ended' => TripState.completed,
          _ => TripState.notStarted,
        },
        startedAt: DateTime.tryParse(j['startedAt']?.toString() ?? ''),
        endedAt: DateTime.tryParse(j['endedAt']?.toString() ?? ''),
        distanceMeters: (j['distanceMeters'] as num?)?.toDouble() ?? 0,
      );

  Trip copyWith({TripState? state, DateTime? startedAt, DateTime? endedAt, double? distanceMeters}) => Trip(
        id: id,
        routeId: routeId,
        routeName: routeName,
        state: state ?? this.state,
        startedAt: startedAt ?? this.startedAt,
        endedAt: endedAt ?? this.endedAt,
        distanceMeters: distanceMeters ?? this.distanceMeters,
      );

  static const empty = Trip(id: '', routeId: '', routeName: '');
}
