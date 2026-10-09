import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../models/route_stop.dart';
import '../../models/trip.dart';
import '../../providers/data_providers.dart';
import '../../providers/providers.dart';
import '../../providers/trip_provider.dart';

/// Live map on OpenStreetMap (flutter_map) — no Google Maps SDK, no API key.
///
/// - Full-bleed map with a floating trip HUD (status, speed, distance, time,
///   GPS quality) and a "Next stop" card with distance, ETA and one-tap
///   navigation.
/// - Numbered stop pins coloured by status, the school pin, the planned route
///   (dashed, stop order → school) and the driven trail.
/// - Bus marker that turns with the heading, inside a GPS-accuracy circle.
/// - Map styles (Standard / Light / Satellite), fit-all, zoom and follow.
class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});
  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

enum _MapStyle { standard, light, satellite }

extension on _MapStyle {
  String get label => switch (this) {
        _MapStyle.standard => 'Standard',
        _MapStyle.light => 'Light',
        _MapStyle.satellite => 'Satellite',
      };
  IconData get icon => switch (this) {
        _MapStyle.standard => Icons.map_outlined,
        _MapStyle.light => Icons.layers_clear_outlined,
        _MapStyle.satellite => Icons.satellite_alt_outlined,
      };
  String get url => switch (this) {
        _MapStyle.standard => 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        _MapStyle.light => 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        _MapStyle.satellite => 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      };
  List<String> get subdomains => this == _MapStyle.light ? const ['a', 'b', 'c', 'd'] : const [];
  List<String> get attribution => switch (this) {
        _MapStyle.standard => const ['OpenStreetMap contributors'],
        _MapStyle.light => const ['OpenStreetMap contributors', 'CARTO'],
        _MapStyle.satellite => const ['Esri, Maxar, Earthstar Geographics'],
      };
}

/// A stop with coordinates, in route order.
typedef _Stop = ({int n, RouteStop stop, LatLng point});

class _MapScreenState extends ConsumerState<MapScreen> {
  final MapController _map = MapController();
  final Distance _distance = const Distance();
  StreamSubscription<Position>? _sub;
  Timer? _ticker;

  LatLng? _current;
  double _heading = 0;
  double _speedKmh = 0;
  double _accuracy = 0;
  double _distanceMeters = 0;
  final List<LatLng> _trail = [];
  bool _autoFollow = true;
  bool _mapReady = false;
  bool _gpsDenied = false;
  _MapStyle _style = _MapStyle.standard;

  @override
  void initState() {
    super.initState();
    _listenLocation();
    // Refresh the trip clock once a second.
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && ref.read(tripControllerProvider).state.isRunning) setState(() {});
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    _ticker?.cancel();
    super.dispose();
  }

  Future<void> _listenLocation() async {
    final loc = ref.read(locationServiceProvider);
    if (!await loc.ensurePermissions()) {
      if (mounted) setState(() => _gpsDenied = true);
      return;
    }
    _sub = loc.positionStream().listen((pos) {
      final here = LatLng(pos.latitude, pos.longitude);
      setState(() {
        _speedKmh = (pos.speed * 3.6).clamp(0, 200).toDouble();
        _accuracy = pos.accuracy;
        // Heading is only meaningful while moving.
        if (pos.speed > 1 && pos.heading >= 0) _heading = pos.heading;
        if (_current != null) _distanceMeters += _distance(_current!, here);
        _current = here;
        _trail.add(here);
        if (_trail.length > 1000) _trail.removeAt(0);
      });
      if (_autoFollow && _mapReady) _map.move(here, _map.camera.zoom);
    });
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  List<_Stop> _stops(List<BusRoute> routes) {
    var n = 0;
    return [
      for (final r in routes)
        for (final s in r.stops)
          if (s.lat != null && s.lng != null) (n: ++n, stop: s, point: LatLng(s.lat!, s.lng!)),
    ];
  }

  /// The stop the driver is heading to: the one marked current, else the first
  /// not yet completed (in route order).
  _Stop? _nextStop(List<_Stop> stops) {
    for (final s in stops) {
      if (s.stop.status == StopStatus.current) return s;
    }
    for (final s in stops) {
      if (s.stop.status != StopStatus.completed) return s;
    }
    return null;
  }

  String _fmtDuration(Duration d) {
    final h = d.inHours, m = d.inMinutes % 60, s = d.inSeconds % 60;
    return h > 0 ? '${h}h ${m.toString().padLeft(2, '0')}m' : '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  String _fmtKm(double meters) => meters < 1000 ? '${meters.toStringAsFixed(0)} m' : '${(meters / 1000).toStringAsFixed(1)} km';

  /// ETA at the current speed, or an urban 25 km/h average when crawling.
  String _eta(double meters) {
    final kmh = _speedKmh > 8 ? _speedKmh : 25;
    final mins = (meters / 1000 / kmh * 60).round();
    return mins < 1 ? '< 1 min' : '$mins min';
  }

  (String, Color) get _gpsQuality {
    if (_gpsDenied) return ('GPS off', AppColors.danger);
    if (_accuracy <= 0) return ('Searching', AppColors.slate500);
    if (_accuracy <= 15) return ('±${_accuracy.toStringAsFixed(0)} m', AppColors.green);
    if (_accuracy <= 40) return ('±${_accuracy.toStringAsFixed(0)} m', AppColors.warning);
    return ('±${_accuracy.toStringAsFixed(0)} m', AppColors.danger);
  }

  // ── Camera ─────────────────────────────────────────────────────────────────

  void _fitAll(List<LatLng> points) {
    if (!_mapReady || points.isEmpty) return;
    setState(() => _autoFollow = false);
    if (points.length == 1) {
      _map.move(points.first, 16);
      return;
    }
    _map.fitCamera(CameraFit.coordinates(
      coordinates: points,
      padding: const EdgeInsets.fromLTRB(48, 190, 72, 210),
      maxZoom: 17,
    ));
  }

  void _follow() {
    setState(() => _autoFollow = true);
    if (_current != null && _mapReady) _map.move(_current!, math.max(_map.camera.zoom, 16));
  }

  void _zoom(double by) {
    if (!_mapReady) return;
    _map.move(_map.camera.center, (_map.camera.zoom + by).clamp(3, 19).toDouble());
  }

  // ── External navigation ────────────────────────────────────────────────────

  Future<void> _navigateTo(LatLng p) async {
    // google.navigation gives turn-by-turn in the Google Maps app; the https URL
    // is the universal fallback (browser or app).
    final nav = Uri.parse('google.navigation:q=${p.latitude},${p.longitude}');
    if (await canLaunchUrl(nav)) {
      await launchUrl(nav, mode: LaunchMode.externalApplication);
      return;
    }
    final web = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}&travelmode=driving');
    if (await canLaunchUrl(web)) await launchUrl(web, mode: LaunchMode.externalApplication);
  }

  /// Google Maps directions through ALL stops (current location → waypoints),
  /// preferring the Google Maps app over the browser.
  Future<void> _navigateAll(List<LatLng> stops) async {
    if (stops.isEmpty) return;
    final origin = _current != null ? '${_current!.latitude},${_current!.longitude}' : '';
    final dest = stops.last;
    final waypoints = stops.length > 1 ? stops.sublist(0, stops.length - 1).map((s) => '${s.latitude},${s.longitude}').join('|') : '';
    final appUri = Uri.parse(
      'comgooglemaps://?daddr=${dest.latitude},${dest.longitude}'
      '${origin.isNotEmpty ? '&saddr=$origin' : ''}'
      '${waypoints.isNotEmpty ? '&waypoints=$waypoints' : ''}'
      '&directionsmode=driving',
    );
    if (await canLaunchUrl(appUri)) {
      await launchUrl(appUri, mode: LaunchMode.externalApplication);
      return;
    }
    final web = Uri.parse(
      'https://www.google.com/maps/dir/?api=1'
      '${origin.isNotEmpty ? '&origin=$origin' : ''}'
      '&destination=${dest.latitude},${dest.longitude}'
      '${waypoints.isNotEmpty ? '&waypoints=$waypoints' : ''}'
      '&travelmode=driving',
    );
    if (await canLaunchUrl(web)) await launchUrl(web, mode: LaunchMode.externalApplication);
  }

  // ── Sheets ─────────────────────────────────────────────────────────────────

  Future<void> _showStyleSheet() async {
    final picked = await showModalBottomSheet<_MapStyle>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('MAP STYLE', style: TextStyle(fontSize: 11.5, letterSpacing: 1.1, fontWeight: FontWeight.w900, color: AppColors.slate500)),
            const SizedBox(height: 10),
            Row(children: [
              for (final st in _MapStyle.values) ...[
                Expanded(
                  child: _StyleOption(style: st, selected: st == _style, onTap: () => Navigator.pop(ctx, st)),
                ),
                if (st != _MapStyle.values.last) const SizedBox(width: 10),
              ],
            ]),
          ]),
        ),
      ),
    );
    if (picked != null) setState(() => _style = picked);
  }

  Future<void> _showStopSheet(_Stop s) async {
    final km = _current == null ? null : _distance(_current!, s.point);
    await showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              _StopBadge(n: s.n, status: s.stop.status, size: 40),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(s.stop.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: AppColors.slate800)),
                  Text(_statusLabel(s.stop.status), style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5, color: _statusColor(s.stop.status))),
                ]),
              ),
            ]),
            const SizedBox(height: 14),
            Row(children: [
              _SheetStat(icon: Icons.schedule, label: 'Scheduled', value: s.stop.scheduledTime.isEmpty ? '—' : s.stop.scheduledTime),
              _SheetStat(icon: Icons.people_outline, label: 'Students', value: '${s.stop.studentCount}'),
              _SheetStat(icon: Icons.straighten, label: 'Distance', value: km == null ? '—' : _fmtKm(km)),
              _SheetStat(icon: Icons.timer_outlined, label: 'ETA', value: km == null ? '—' : _eta(km)),
            ]),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () {
                Navigator.pop(ctx);
                _navigateTo(s.point);
              },
              icon: const Icon(Icons.navigation_outlined, size: 18),
              label: const Text('Navigate in Google Maps'),
            ),
          ]),
        ),
      ),
    );
  }

  Future<void> _showAllStops(List<_Stop> stops) async {
    final from = _current;
    await showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) => ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(ctx).height * 0.7),
        child: SafeArea(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 8, 8),
              child: Row(children: [
                Expanded(
                  child: Text('${stops.length} stops · route order',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.slate800)),
                ),
                TextButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    _navigateAll(stops.where((s) => s.stop.status != StopStatus.completed).map((s) => s.point).toList());
                  },
                  icon: const Icon(Icons.alt_route, size: 18),
                  label: const Text('Route all'),
                ),
              ]),
            ),
            const Divider(),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: stops.length,
                separatorBuilder: (_, __) => const Divider(),
                itemBuilder: (_, i) {
                  final s = stops[i];
                  final d = from == null ? null : _distance(from, s.point);
                  return ListTile(
                    leading: _StopBadge(n: s.n, status: s.stop.status, size: 34),
                    title: Text(s.stop.name, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate800)),
                    subtitle: Text(
                      [
                        if (s.stop.scheduledTime.isNotEmpty) s.stop.scheduledTime,
                        '${s.stop.studentCount} students',
                        if (d != null) _fmtKm(d),
                      ].join(' · '),
                      style: const TextStyle(color: AppColors.slate500, fontSize: 12.5),
                    ),
                    trailing: IconButton(
                      tooltip: 'Navigate',
                      icon: const Icon(Icons.navigation_outlined, color: AppColors.accent),
                      onPressed: () {
                        Navigator.pop(ctx);
                        _navigateTo(s.point);
                      },
                    ),
                    onTap: () {
                      Navigator.pop(ctx);
                      setState(() => _autoFollow = false);
                      if (_mapReady) _map.move(s.point, 17);
                    },
                  );
                },
              ),
            ),
          ]),
        ),
      ),
    );
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final trip = ref.watch(tripControllerProvider);
    final routes = ref.watch(driverRoutesProvider).valueOrNull ?? const <BusRoute>[];
    final schoolLat = routes.isNotEmpty ? routes.first.schoolLat : null;
    final schoolLng = routes.isNotEmpty ? routes.first.schoolLng : null;
    final school = schoolLat != null && schoolLng != null ? LatLng(schoolLat, schoolLng) : null;
    final stops = _stops(routes);
    final next = _nextStop(stops);
    final planned = [for (final s in stops) s.point, if (school != null) school];
    final everything = [...planned, if (_current != null) _current!];
    final initialCenter = _current ?? school ?? (stops.isNotEmpty ? stops.first.point : const LatLng(-1.2921, 36.8219));
    final elapsed = trip.startedAt == null ? Duration.zero : DateTime.now().difference(trip.startedAt!);
    final distance = math.max(_distanceMeters, trip.distanceMeters);

    return Stack(children: [
      FlutterMap(
        mapController: _map,
        options: MapOptions(
          initialCenter: initialCenter,
          initialZoom: 15,
          maxZoom: 19,
          onMapReady: () {
            _mapReady = true;
            // First look: show the whole route until GPS takes over.
            if (_current == null && everything.length > 1) _fitAll(everything);
          },
          // Dragging the map stops auto-follow until the driver re-centres.
          onPositionChanged: (_, hasGesture) {
            if (hasGesture && _autoFollow) setState(() => _autoFollow = false);
          },
        ),
        children: [
          TileLayer(
            urlTemplate: _style.url,
            subdomains: _style.subdomains,
            userAgentPackageName: 'com.shulecloud.shulecloud_driver',
            maxZoom: 19,
            retinaMode: _style == _MapStyle.light && RetinaMode.isHighDensity(context),
          ),
          if (planned.length > 1)
            PolylineLayer(polylines: [
              Polyline(
                points: planned,
                strokeWidth: 4,
                color: AppColors.accent.withValues(alpha: 0.55),
                pattern: StrokePattern.dashed(segments: const [12, 8]),
              ),
            ]),
          if (_trail.length > 1)
            PolylineLayer(polylines: [
              Polyline(
                points: _trail,
                strokeWidth: 6,
                color: AppColors.accentBlue,
                borderStrokeWidth: 2,
                borderColor: Colors.white,
              ),
            ]),
          if (_current != null && _accuracy > 0)
            CircleLayer(circles: [
              CircleMarker(
                point: _current!,
                radius: _accuracy,
                useRadiusInMeter: true,
                color: AppColors.accentBlue.withValues(alpha: 0.12),
                borderColor: AppColors.accentBlue.withValues(alpha: 0.35),
                borderStrokeWidth: 1,
              ),
            ]),
          MarkerLayer(markers: [
            if (school != null)
              Marker(
                point: school,
                width: 44,
                height: 44,
                child: const _RoundPin(icon: Icons.school, color: AppColors.gold),
              ),
            for (final s in stops)
              Marker(
                point: s.point,
                width: 120,
                height: 58,
                alignment: Alignment.topCenter,
                child: GestureDetector(
                  onTap: () => _showStopSheet(s),
                  child: _StopPin(stop: s, isNext: s.n == next?.n),
                ),
              ),
            if (_current != null)
              Marker(
                point: _current!,
                width: 68,
                height: 68,
                child: _BusPin(headingDegrees: _heading, moving: _speedKmh > 3),
              ),
          ]),
          RichAttributionWidget(
            alignment: AttributionAlignment.bottomLeft,
            attributions: [for (final a in _style.attribution) TextSourceAttribution(a)],
          ),
        ],
      ),

      // ── Trip HUD ─────────────────────────────────────────────────────────
      Positioned(
        top: 12,
        left: 12,
        right: 12,
        child: _Hud(
          trip: trip,
          speedKmh: _speedKmh,
          distance: _fmtKm(distance),
          elapsed: _fmtDuration(elapsed),
          gps: _gpsQuality,
        ),
      ),

      // ── Map controls ─────────────────────────────────────────────────────
      Positioned(
        right: 12,
        top: 150,
        child: Column(children: [
          _MapButton(icon: _style.icon, tooltip: 'Map style', onTap: _showStyleSheet),
          const SizedBox(height: 10),
          _MapButton(icon: Icons.fit_screen_outlined, tooltip: 'Show whole route', onTap: () => _fitAll(everything)),
          const SizedBox(height: 10),
          _ZoomButtons(onIn: () => _zoom(1), onOut: () => _zoom(-1)),
          const SizedBox(height: 10),
          _MapButton(
            icon: _autoFollow ? Icons.navigation : Icons.my_location,
            tooltip: _autoFollow ? 'Following bus' : 'Follow bus',
            active: _autoFollow,
            onTap: _follow,
          ),
        ]),
      ),

      // ── Next stop ────────────────────────────────────────────────────────
      Positioned(
        left: 12,
        right: 12,
        bottom: 12,
        child: _NextStopCard(
          next: next,
          total: stops.length,
          completed: stops.where((s) => s.stop.status == StopStatus.completed).length,
          distance: next == null || _current == null ? null : _distance(_current!, next.point),
          fmtKm: _fmtKm,
          eta: _eta,
          gpsDenied: _gpsDenied,
          onOpen: next == null ? null : () => _showStopSheet(next),
          onNavigate: next == null ? null : () => _navigateTo(next.point),
          onAllStops: stops.isEmpty ? null : () => _showAllStops(stops),
        ),
      ),
    ]);
  }
}

// ── Pieces ───────────────────────────────────────────────────────────────────

String _statusLabel(StopStatus s) => switch (s) {
      StopStatus.completed => 'Completed',
      StopStatus.current => 'Current stop',
      StopStatus.pending => 'Upcoming',
    };

Color _statusColor(StopStatus s) => switch (s) {
      StopStatus.completed => AppColors.green,
      StopStatus.current => AppColors.warning,
      StopStatus.pending => AppColors.accent,
    };

const _floatShadow = [BoxShadow(color: Color(0x290F172A), blurRadius: 14, offset: Offset(0, 4))];

class _Hud extends StatelessWidget {
  final Trip trip;
  final double speedKmh;
  final String distance;
  final String elapsed;
  final (String, Color) gps;
  const _Hud({required this.trip, required this.speedKmh, required this.distance, required this.elapsed, required this.gps});

  @override
  Widget build(BuildContext context) {
    final running = trip.state.isRunning;
    final statusColor = switch (trip.state) {
      TripState.started => AppColors.danger,
      TripState.paused => AppColors.warning,
      TripState.completed => AppColors.green,
      TripState.notStarted => AppColors.slate500,
    };
    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: _floatShadow),
      clipBehavior: Clip.antiAlias,
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          color: AppColors.accent,
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
          child: Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: statusColor, borderRadius: BorderRadius.circular(4)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                if (running) ...[
                  Container(width: 6, height: 6, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
                  const SizedBox(width: 5),
                ],
                Text(running ? 'LIVE' : trip.state.label.toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontSize: 10, letterSpacing: 0.6, fontWeight: FontWeight.w900)),
              ]),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(trip.routeName.isEmpty ? 'Live Tracking' : trip.routeName,
                  maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
            ),
            Text.rich(TextSpan(children: [
              TextSpan(text: speedKmh.toStringAsFixed(0), style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
              const TextSpan(text: ' km/h', style: TextStyle(color: AppColors.gold, fontSize: 11, fontWeight: FontWeight.w800)),
            ])),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: IntrinsicHeight(
            child: Row(children: [
              _HudStat(icon: Icons.straighten, label: 'DISTANCE', value: distance),
              const VerticalDivider(width: 1, color: AppColors.slate200),
              _HudStat(icon: Icons.timer_outlined, label: 'TRIP TIME', value: elapsed),
              const VerticalDivider(width: 1, color: AppColors.slate200),
              _HudStat(icon: Icons.gps_fixed, label: 'GPS', value: gps.$1, color: gps.$2),
            ]),
          ),
        ),
      ]),
    );
  }
}

class _HudStat extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _HudStat({required this.icon, required this.label, required this.value, this.color = AppColors.slate800});
  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(children: [
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(icon, size: 12, color: AppColors.slate400),
            const SizedBox(width: 4),
            Text(label, style: const TextStyle(fontSize: 9.5, letterSpacing: 0.6, fontWeight: FontWeight.w800, color: AppColors.slate500)),
          ]),
          const SizedBox(height: 2),
          FittedBox(child: Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: color))),
        ]),
      );
}

class _NextStopCard extends StatelessWidget {
  final _Stop? next;
  final int total;
  final int completed;
  final double? distance;
  final String Function(double) fmtKm;
  final String Function(double) eta;
  final bool gpsDenied;
  final VoidCallback? onOpen;
  final VoidCallback? onNavigate;
  final VoidCallback? onAllStops;
  const _NextStopCard({
    required this.next,
    required this.total,
    required this.completed,
    required this.distance,
    required this.fmtKm,
    required this.eta,
    required this.gpsDenied,
    this.onOpen,
    this.onNavigate,
    this.onAllStops,
  });

  @override
  Widget build(BuildContext context) {
    final n = next;
    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: _floatShadow),
      padding: const EdgeInsets.all(12),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (gpsDenied)
          const Padding(
            padding: EdgeInsets.only(bottom: 10),
            child: Row(children: [
              Icon(Icons.location_off, size: 16, color: AppColors.danger),
              SizedBox(width: 6),
              Expanded(
                child: Text('Location is off — turn on GPS and allow location access to track the bus.',
                    style: TextStyle(color: AppColors.danger, fontSize: 12, fontWeight: FontWeight.w700)),
              ),
            ]),
          ),
        if (n == null)
          Row(children: [
            const Icon(Icons.flag_outlined, color: AppColors.slate400),
            const SizedBox(width: 10),
            Expanded(
              child: Text(total == 0 ? 'No stops with map locations on your route yet.' : 'All $total stops done — head back to school.',
                  style: const TextStyle(color: AppColors.slate600, fontWeight: FontWeight.w700)),
            ),
          ])
        else ...[
          InkWell(
            onTap: onOpen,
            child: Row(children: [
              _StopBadge(n: n.n, status: n.stop.status, size: 40),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('NEXT STOP · $completed/$total DONE',
                      style: const TextStyle(fontSize: 10, letterSpacing: 0.6, fontWeight: FontWeight.w900, color: AppColors.goldText)),
                  Text(n.stop.name,
                      maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.slate800)),
                  Text(
                    [
                      if (distance != null) '${fmtKm(distance!)} · ${eta(distance!)}',
                      '${n.stop.studentCount} students',
                      if (n.stop.scheduledTime.isNotEmpty) 'due ${n.stop.scheduledTime}',
                    ].join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppColors.slate500, fontSize: 12.5, fontWeight: FontWeight.w600),
                  ),
                ]),
              ),
            ]),
          ),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(minimumSize: const Size(0, 42)),
                onPressed: onNavigate,
                icon: const Icon(Icons.navigation_outlined, size: 18),
                label: const Text('Navigate'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(minimumSize: const Size(0, 42)),
                onPressed: onAllStops,
                icon: const Icon(Icons.format_list_numbered, size: 18),
                label: const Text('All stops'),
              ),
            ),
          ]),
        ],
      ]),
    );
  }
}

class _StopBadge extends StatelessWidget {
  final int n;
  final StopStatus status;
  final double size;
  const _StopBadge({required this.n, required this.status, this.size = 30});
  @override
  Widget build(BuildContext context) {
    final c = _statusColor(status);
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: c, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
      child: status == StopStatus.completed
          ? Icon(Icons.check, color: Colors.white, size: size * 0.55)
          : Text('$n', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: size * 0.42)),
    );
  }
}

/// Numbered pin with a name tag underneath; the next stop gets a gold ring.
class _StopPin extends StatelessWidget {
  final _Stop stop;
  final bool isNext;
  const _StopPin({required this.stop, required this.isNext});
  @override
  Widget build(BuildContext context) => Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          padding: const EdgeInsets.all(2),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isNext ? AppColors.gold : Colors.transparent,
            boxShadow: const [BoxShadow(color: Color(0x330F172A), blurRadius: 6, offset: Offset(0, 2))],
          ),
          child: _StopBadge(n: stop.n, status: stop.stop.status, size: isNext ? 32 : 28),
        ),
        const SizedBox(height: 2),
        Container(
          constraints: const BoxConstraints(maxWidth: 120),
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.92), borderRadius: BorderRadius.circular(4)),
          child: Text(stop.stop.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: isNext ? AppColors.accent : AppColors.slate700)),
        ),
      ]);
}

class _RoundPin extends StatelessWidget {
  final IconData icon;
  final Color color;
  const _RoundPin({required this.icon, required this.color});
  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 3),
          boxShadow: const [BoxShadow(color: Color(0x400F172A), blurRadius: 8, offset: Offset(0, 2))],
        ),
        child: Icon(icon, color: Colors.white, size: 22),
      );
}

/// The bus: a navy disc with a direction arrow that turns with the heading.
class _BusPin extends StatelessWidget {
  final double headingDegrees;
  final bool moving;
  const _BusPin({required this.headingDegrees, required this.moving});
  @override
  Widget build(BuildContext context) => Stack(alignment: Alignment.center, children: [
        if (moving)
          Transform.rotate(
            angle: headingDegrees * math.pi / 180,
            child: const Align(
              alignment: Alignment.topCenter,
              child: Icon(Icons.navigation, size: 18, color: AppColors.accentBlue),
            ),
          ),
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: AppColors.accent,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: const [BoxShadow(color: Color(0x550F172A), blurRadius: 8, offset: Offset(0, 2))],
          ),
          child: const Icon(Icons.directions_bus, color: Colors.white, size: 18),
        ),
      ]);
}

class _MapButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final bool active;
  const _MapButton({required this.icon, required this.tooltip, required this.onTap, this.active = false});
  @override
  Widget build(BuildContext context) => Tooltip(
        message: tooltip,
        child: Material(
          color: active ? AppColors.accent : Colors.white,
          borderRadius: BorderRadius.circular(10),
          elevation: 3,
          shadowColor: const Color(0x550F172A),
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: onTap,
            child: SizedBox(width: 44, height: 44, child: Icon(icon, size: 22, color: active ? Colors.white : AppColors.slate700)),
          ),
        ),
      );
}

class _ZoomButtons extends StatelessWidget {
  final VoidCallback onIn;
  final VoidCallback onOut;
  const _ZoomButtons({required this.onIn, required this.onOut});
  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        elevation: 3,
        shadowColor: const Color(0x550F172A),
        clipBehavior: Clip.antiAlias,
        child: Column(children: [
          InkWell(onTap: onIn, child: const SizedBox(width: 44, height: 42, child: Icon(Icons.add, color: AppColors.slate700))),
          Container(width: 28, height: 1, color: AppColors.slate200),
          InkWell(onTap: onOut, child: const SizedBox(width: 44, height: 42, child: Icon(Icons.remove, color: AppColors.slate700))),
        ]),
      );
}

class _StyleOption extends StatelessWidget {
  final _MapStyle style;
  final bool selected;
  final VoidCallback onTap;
  const _StyleOption({required this.style, required this.selected, required this.onTap});
  @override
  Widget build(BuildContext context) => Material(
        color: selected ? AppColors.accent.withValues(alpha: 0.08) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          side: BorderSide(color: selected ? AppColors.accent : AppColors.slate200, width: selected ? 2 : 1),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Column(children: [
              Icon(style.icon, color: selected ? AppColors.accent : AppColors.slate500),
              const SizedBox(height: 6),
              Text(style.label,
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: selected ? AppColors.accent : AppColors.slate600)),
            ]),
          ),
        ),
      );
}

class _SheetStat extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _SheetStat({required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(children: [
          Icon(icon, size: 16, color: AppColors.slate400),
          const SizedBox(height: 4),
          FittedBox(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate800))),
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.slate500, fontWeight: FontWeight.w600)),
        ]),
      );
}
