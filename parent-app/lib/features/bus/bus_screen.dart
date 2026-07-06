import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../models/misc_models.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';

/// Live bus tracking on OpenStreetMap (flutter_map) — NO Google Maps, no key.
class BusScreen extends ConsumerWidget {
  const BusScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final busAsync = ref.watch(busProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bus Tracking', style: TextStyle(fontSize: 22)),
        actions: [IconButton(onPressed: () => ref.invalidate(busProvider), icon: const Icon(Icons.refresh))],
      ),
      body: busAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => ErrorView.fromError(_, onRetry: () => ref.invalidate(busProvider)),
        data: (bus) => _BusView(bus: bus),
      ),
    );
  }
}

class _BusView extends StatelessWidget {
  final BusStatus bus;
  const _BusView({required this.bus});

  @override
  Widget build(BuildContext context) {
    final center = bus.position ?? bus.school ?? const LatLng(-1.2921, 36.8219);
    final markers = <Marker>[
      if (bus.school != null) _pin(bus.school!, Icons.school, AppColors.tertiary),
      if (bus.home != null) _pin(bus.home!, Icons.home, AppColors.secondary),
      if (bus.position != null)
        Marker(point: bus.position!, width: 46, height: 46, child: Container(
          decoration: BoxDecoration(color: AppColors.primary, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 3)),
          child: const Icon(Icons.directions_bus, color: Colors.white, size: 22),
        )),
    ];
    final route = <LatLng>[if (bus.home != null) bus.home!, if (bus.position != null) bus.position!, if (bus.school != null) bus.school!];

    return Stack(
      children: [
        FlutterMap(
          options: MapOptions(initialCenter: center, initialZoom: 14),
          children: [
            TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'com.shulecloud.shulecloud_parent'),
            if (route.length > 1) PolylineLayer(polylines: [Polyline(points: route, strokeWidth: 4, color: AppColors.primary)]),
            MarkerLayer(markers: markers),
            const RichAttributionWidget(attributions: [TextSourceAttribution('OpenStreetMap contributors')]),
          ],
        ),
        // Boarding status chip
        Positioned(
          top: 16, left: 0, right: 0,
          child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              decoration: BoxDecoration(color: AppColors.primaryContainer, borderRadius: BorderRadius.circular(999)),
              child: Text('STUDENT ${bus.boardingStatus.toUpperCase()}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, letterSpacing: 1)),
            ),
          ),
        ),
        // Bottom info cluster
        Positioned(
          left: 12, right: 12, bottom: 16,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppCard(
                accent: AppColors.primary,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Estimated Arrival', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                    Text(bus.etaText ?? (bus.online ? 'Live' : 'Offline'), style: const TextStyle(color: AppColors.primary, fontSize: 26, fontWeight: FontWeight.w800)),
                    if (bus.distanceKm != null) Text('${bus.distanceKm!.toStringAsFixed(1)} km away', style: const TextStyle(color: AppColors.onSurface)),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: StatTile(label: 'Speed', value: bus.speedKmh != null ? '${bus.speedKmh!.toStringAsFixed(0)} km/h' : '—', color: AppColors.secondary, icon: Icons.speed)),
                  const SizedBox(width: 10),
                  Expanded(child: AppCard(
                    accent: AppColors.tertiary,
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Driver', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                      Text(bus.driverName.isEmpty ? '—' : bus.driverName, style: const TextStyle(fontWeight: FontWeight.w700)),
                      if (bus.driverPhone != null)
                        InkWell(onTap: () => launchUrl(Uri.parse('tel:${bus.driverPhone}')),
                          child: const Row(children: [Icon(Icons.call, size: 14, color: AppColors.secondary), SizedBox(width: 4), Text('Call', style: TextStyle(color: AppColors.secondary, fontWeight: FontWeight.w600))])),
                    ]),
                  )),
                ],
              ),
              const SizedBox(height: 10),
              AppCard(
                child: Row(children: [
                  Container(width: 44, height: 44, decoration: BoxDecoration(color: AppColors.primaryContainer.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                      child: const Icon(Icons.directions_bus, color: AppColors.primary)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(bus.routeName.isEmpty ? 'Route' : bus.routeName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    Text(bus.busPlate.isEmpty ? '' : bus.busPlate, style: const TextStyle(color: AppColors.onSurfaceVariant)),
                  ])),
                ]),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Marker _pin(LatLng p, IconData icon, Color color) => Marker(point: p, width: 40, height: 40, child: Icon(icon, color: color, size: 34));
}
