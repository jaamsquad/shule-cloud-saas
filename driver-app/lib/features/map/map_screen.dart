import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../models/trip.dart';
import '../../providers/data_providers.dart';
import '../../providers/providers.dart';
import '../../providers/trip_provider.dart';
import '../../widgets/status_chip.dart';

/// Live map built on OpenStreetMap (flutter_map) — NO Google Maps, no API key.
/// Shows the live bus marker, school + stop markers, the driven route polyline,
/// current speed, GPS accuracy, distance travelled, a trip timer, auto-follow,
/// and zoom controls.
class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});
  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final MapController _map = MapController();
  final Distance _distance = const Distance();
  StreamSubscription<Position>? _sub;

  LatLng? _current;
  double _speedKmh = 0;
  double _accuracy = 0;
  double _distanceMeters = 0;
  final List<LatLng> _trail = [];
  bool _autoFollow = true;
  final Stopwatch _timer = Stopwatch();

  @override
  void initState() {
    super.initState();
    _listenLocation();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _listenLocation() async {
    final loc = ref.read(locationServiceProvider);
    if (!await loc.ensurePermissions()) return;
    _sub = loc.positionStream().listen((pos) {
      final here = LatLng(pos.latitude, pos.longitude);
      setState(() {
        _speedKmh = (pos.speed * 3.6).clamp(0, 200);
        _accuracy = pos.accuracy;
        if (_current != null) {
          _distanceMeters += _distance(_current!, here);
        }
        _current = here;
        _trail.add(here);
        if (_trail.length > 500) _trail.removeAt(0);
      });
      if (_autoFollow) _map.move(here, _map.camera.zoom); // auto-follow
    });
  }

  String _fmt(Duration d) =>
      '${d.inMinutes.toString().padLeft(2, '0')}:${(d.inSeconds % 60).toString().padLeft(2, '0')}';

  // Open external turn-by-turn directions through all stops. Prefers the OSM
  // directions page (multi-waypoint, no API key); falls back to a geo: intent.
  Future<void> _navigateStops(List<LatLng> stops) async {
    if (stops.isEmpty) return;
    final from = _current;
    // OSRM/OSM directions: route=lat,lng;lat,lng;... (driving profile).
    final coords = [
      if (from != null) '${from.latitude},${from.longitude}',
      ...stops.map((s) => '${s.latitude},${s.longitude}'),
    ].join(';');
    final osm = Uri.parse('https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=$coords');
    if (await canLaunchUrl(osm)) {
      await launchUrl(osm, mode: LaunchMode.externalApplication);
      return;
    }
    // Fallback: open the first stop in whatever map app is installed.
    final first = stops.first;
    final geo = Uri.parse('geo:${first.latitude},${first.longitude}?q=${first.latitude},${first.longitude}(Stop)');
    if (await canLaunchUrl(geo)) await launchUrl(geo);
  }

  @override
  Widget build(BuildContext context) {
    final trip = ref.watch(tripControllerProvider);
    if (trip.state.isRunning && !_timer.isRunning) _timer.start();
    final routesAsync = ref.watch(driverRoutesProvider);
    final routes = routesAsync.valueOrNull ?? const [];
    // School coords come from any route (they share the school).
    final schoolLat = routes.isNotEmpty ? routes.first.schoolLat : null;
    final schoolLng = routes.isNotEmpty ? routes.first.schoolLng : null;

    // Assemble markers: school, stops from EVERY zone the driver serves, live bus.
    final markers = <Marker>[];
    if (schoolLat != null && schoolLng != null) {
      markers.add(_pin(LatLng(schoolLat, schoolLng), Icons.school, AppColors.primary));
    }
    for (final route in routes) {
      for (final s in route.stops) {
        if (s.lat != null && s.lng != null) {
          markers.add(_pin(LatLng(s.lat!, s.lng!), Icons.location_on, AppColors.accentBlue, label: s.name));
        }
      }
    }
    if (_current != null) {
      markers.add(Marker(
        point: _current!,
        width: 46,
        height: 46,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.primary,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 6)],
          ),
          child: const Icon(Icons.directions_bus, color: Colors.white, size: 24),
        ),
      ));
    }

    final initialCenter = _current ??
        (schoolLat != null ? LatLng(schoolLat, schoolLng!) : const LatLng(-1.2921, 36.8219));

    // Waypoints (all stops with coords, from every zone) for turn-by-turn nav.
    final waypoints = <LatLng>[
      for (final route in routes)
        for (final s in route.stops)
          if (s.lat != null && s.lng != null) LatLng(s.lat!, s.lng!),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Live Tracking')),
      floatingActionButton: waypoints.isEmpty
          ? null
          : FloatingActionButton.extended(
              backgroundColor: AppColors.primary,
              onPressed: () => _navigateStops(waypoints),
              icon: const Icon(Icons.alt_route, color: Colors.white),
              label: const Text('Navigate stops', style: TextStyle(color: Colors.white)),
            ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                StatusChip(icon: Icons.speed, label: '${_speedKmh.toStringAsFixed(0)} km/h', color: AppColors.accentBlue),
                StatusChip(icon: Icons.straighten, label: '${(_distanceMeters / 1000).toStringAsFixed(1)} km', color: AppColors.primary),
                StatusChip(icon: Icons.gps_fixed, label: _accuracy > 0 ? '±${_accuracy.toStringAsFixed(0)} m' : 'GPS…', color: AppColors.primary),
                StatusChip(icon: Icons.timer, label: _fmt(_timer.elapsed), color: AppColors.textMuted),
              ],
            ),
          ),
          Expanded(
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _map,
                  options: MapOptions(
                    initialCenter: initialCenter,
                    initialZoom: 15,
                    // If the user drags the map, stop auto-following until they re-enable it.
                    onPointerDown: (_, __) {
                      if (_autoFollow) setState(() => _autoFollow = false);
                    },
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.shulecloud.shulecloud_driver',
                      maxZoom: 19,
                    ),
                    if (_trail.length > 1)
                      PolylineLayer(polylines: [
                        Polyline(points: _trail, strokeWidth: 5, color: AppColors.primary.withValues(alpha: 0.8)),
                      ]),
                    MarkerLayer(markers: markers),
                    // OSM attribution (required by the tile usage policy).
                    const RichAttributionWidget(attributions: [
                      TextSourceAttribution('OpenStreetMap contributors'),
                    ]),
                  ],
                ),
                // Zoom + recenter controls.
                Positioned(
                  right: 12,
                  bottom: 20,
                  child: Column(
                    children: [
                      _ctrlButton(Icons.add, () => _map.move(_map.camera.center, _map.camera.zoom + 1)),
                      const SizedBox(height: 8),
                      _ctrlButton(Icons.remove, () => _map.move(_map.camera.center, _map.camera.zoom - 1)),
                      const SizedBox(height: 8),
                      _ctrlButton(
                        _autoFollow ? Icons.my_location : Icons.location_searching,
                        () {
                          setState(() => _autoFollow = true);
                          if (_current != null) _map.move(_current!, 16);
                        },
                        active: _autoFollow,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Marker _pin(LatLng p, IconData icon, Color color, {String? label}) => Marker(
        point: p,
        width: 40,
        height: 40,
        child: Icon(icon, color: color, size: 34),
      );

  Widget _ctrlButton(IconData icon, VoidCallback onTap, {bool active = false}) => Material(
        color: active ? AppColors.primary : Colors.white,
        shape: const CircleBorder(),
        elevation: 3,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Icon(icon, color: active ? Colors.white : AppColors.textDark, size: 22),
          ),
        ),
      );
}
