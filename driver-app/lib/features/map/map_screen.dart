import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../../core/theme/app_theme.dart';
import '../../models/route_stop.dart';
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

  @override
  Widget build(BuildContext context) {
    final trip = ref.watch(tripControllerProvider);
    if (trip.state.isRunning && !_timer.isRunning) _timer.start();
    final routeAsync = ref.watch(todayRouteProvider);
    final route = routeAsync.valueOrNull;

    // Assemble markers: school, stops, and the live bus.
    final markers = <Marker>[];
    if (route?.schoolLat != null && route?.schoolLng != null) {
      markers.add(_pin(LatLng(route!.schoolLat!, route.schoolLng!), Icons.school, AppColors.primary));
    }
    for (final s in route?.stops ?? const <RouteStop>[]) {
      if (s.lat != null && s.lng != null) {
        markers.add(_pin(LatLng(s.lat!, s.lng!), Icons.location_on, AppColors.accentBlue, label: s.name));
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
        (route?.schoolLat != null ? LatLng(route!.schoolLat!, route.schoolLng!) : const LatLng(-1.2921, 36.8219));

    return Scaffold(
      appBar: AppBar(title: const Text('Live Tracking')),
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
