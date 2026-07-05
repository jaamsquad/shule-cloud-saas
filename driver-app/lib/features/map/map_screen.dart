import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/providers.dart';
import '../../providers/trip_provider.dart';
import '../../widgets/status_chip.dart';

/// Live map: current bus position, auto-follow, speed/ETA/distance/timer stats.
class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});
  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  GoogleMapController? _controller;
  final Set<Marker> _markers = {};
  double _speedKmh = 0;
  final Stopwatch _timer = Stopwatch();

  @override
  void initState() {
    super.initState();
    _listenLocation();
  }

  Future<void> _listenLocation() async {
    final loc = ref.read(locationServiceProvider);
    if (!await loc.ensurePermissions()) return;
    loc.positionStream().listen((pos) {
      final latLng = LatLng(pos.latitude, pos.longitude);
      setState(() {
        _speedKmh = (pos.speed * 3.6).clamp(0, 200);
        _markers
          ..clear()
          ..add(Marker(markerId: const MarkerId('bus'), position: latLng, infoWindow: const InfoWindow(title: 'Your bus')));
      });
      _controller?.animateCamera(CameraUpdate.newLatLng(latLng)); // auto-follow
    });
  }

  @override
  Widget build(BuildContext context) {
    final trip = ref.watch(tripControllerProvider);
    if (trip.state.isRunning && !_timer.isRunning) _timer.start();

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
                const StatusChip(icon: Icons.schedule, label: 'ETA 12 min', color: AppColors.primary),
                StatusChip(icon: Icons.gps_fixed, label: trip.state.isRunning ? 'GPS High' : 'GPS Idle', color: AppColors.primary),
                StatusChip(icon: Icons.timer, label: _fmt(_timer.elapsed), color: AppColors.textMuted),
              ],
            ),
          ),
          Expanded(
            child: GoogleMap(
              initialCameraPosition: const CameraPosition(target: LatLng(-1.2921, 36.8219), zoom: 14),
              myLocationEnabled: true,
              myLocationButtonEnabled: true,
              markers: _markers,
              onMapCreated: (c) => _controller = c,
            ),
          ),
        ],
      ),
    );
  }

  String _fmt(Duration d) => '${d.inMinutes.toString().padLeft(2, '0')}:${(d.inSeconds % 60).toString().padLeft(2, '0')}';
}
