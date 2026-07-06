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
  // Show all stops as a list, ordered NEAREST-FIRST from the driver's current
  // position, so the driver starts with the closest stage. Each row opens that
  // stop directly in Google Maps; a top button opens full directions through all.
  Future<void> _showStopsSheet(List<({String name, LatLng point})> stops) async {
    final from = _current;
    final ordered = [...stops];
    if (from != null) {
      ordered.sort((a, b) => _distance(from, a.point).compareTo(_distance(from, b.point)));
    }
    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Row(
                children: [
                  const Expanded(
                    child: Text('Stops — nearest first', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  ),
                  TextButton.icon(
                    onPressed: () { Navigator.pop(ctx); _openDirectionsAll(ordered.map((e) => e.point).toList()); },
                    icon: const Icon(Icons.directions),
                    label: const Text('Route all'),
                  ),
                ],
              ),
            ),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: ordered.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final s = ordered[i];
                  final km = from != null ? (_distance(from, s.point) / 1000) : null;
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: i == 0 ? AppColors.primary : AppColors.accentBlue.withValues(alpha: 0.15),
                      child: Text('${i + 1}', style: TextStyle(color: i == 0 ? Colors.white : AppColors.accentBlue, fontWeight: FontWeight.w800)),
                    ),
                    title: Text(s.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text([
                      if (i == 0) 'Nearest — start here',
                      if (km != null) '${km.toStringAsFixed(1)} km away',
                    ].join(' · ')),
                    trailing: const Icon(Icons.navigation, color: AppColors.primary),
                    onTap: () { Navigator.pop(ctx); _openInGoogleMaps(s.point, s.name); },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Open a single stop's location in Google Maps (navigation).
  Future<void> _openInGoogleMaps(LatLng p, String label) async {
    // google.navigation gives turn-by-turn in the Google Maps app; the https URL
    // is the universal fallback (browser or app).
    final nav = Uri.parse('google.navigation:q=${p.latitude},${p.longitude}');
    if (await canLaunchUrl(nav)) { await launchUrl(nav, mode: LaunchMode.externalApplication); return; }
    final web = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}');
    if (await canLaunchUrl(web)) await launchUrl(web, mode: LaunchMode.externalApplication);
  }

  // Open Google Maps directions through ALL stops (current location → waypoints).
  Future<void> _openDirectionsAll(List<LatLng> stops) async {
    if (stops.isEmpty) return;
    final origin = _current != null ? '${_current!.latitude},${_current!.longitude}' : '';
    final dest = stops.last;
    final waypoints = stops.length > 1
        ? stops.sublist(0, stops.length - 1).map((s) => '${s.latitude},${s.longitude}').join('|')
        : '';
    final url = Uri.parse(
      'https://www.google.com/maps/dir/?api=1'
      '${origin.isNotEmpty ? '&origin=$origin' : ''}'
      '&destination=${dest.latitude},${dest.longitude}'
      '${waypoints.isNotEmpty ? '&waypoints=$waypoints' : ''}'
      '&travelmode=driving',
    );
    if (await canLaunchUrl(url)) await launchUrl(url, mode: LaunchMode.externalApplication);
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

    // Named stops with coords (from every zone) for turn-by-turn nav.
    final stopPoints = <({String name, LatLng point})>[
      for (final route in routes)
        for (final s in route.stops)
          if (s.lat != null && s.lng != null) (name: s.name, point: LatLng(s.lat!, s.lng!)),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Live Tracking')),
      floatingActionButton: stopPoints.isEmpty
          ? null
          : FloatingActionButton.extended(
              backgroundColor: AppColors.primary,
              onPressed: () => _showStopsSheet(stopPoints),
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
