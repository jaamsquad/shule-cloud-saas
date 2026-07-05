import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../models/route_stop.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';

/// Today's route: ordered stops with status, times, and a Navigate button.
class RouteScreen extends ConsumerWidget {
  const RouteScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(todayRouteProvider);
    return Scaffold(
      appBar: AppBar(title: const Text("Today's Route")),
      body: async.when(
        loading: () => const SkeletonList(),
        error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(todayRouteProvider)),
        data: (route) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                Chip(label: Text(route.name), backgroundColor: AppColors.accentBlue.withValues(alpha: 0.12)),
                const SizedBox(width: 8),
                Text('• ${route.busPlate}', style: const TextStyle(color: AppColors.textMuted)),
              ],
            ),
            const SizedBox(height: 16),
            for (int i = 0; i < route.stops.length; i++) _StopTile(stop: route.stops[i], isLast: i == route.stops.length - 1),
          ],
        ),
      ),
    );
  }
}

class _StopTile extends StatelessWidget {
  final RouteStop stop;
  final bool isLast;
  const _StopTile({required this.stop, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final color = switch (stop.status) {
      StopStatus.completed => AppColors.primary,
      StopStatus.current => AppColors.primary,
      StopStatus.pending => AppColors.textMuted,
    };
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              CircleAvatar(radius: 16, backgroundColor: color, child: Icon(_icon(stop.status), size: 16, color: Colors.white)),
              if (!isLast) Expanded(child: Container(width: 2, color: AppColors.border)),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(stop.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
                        Text(stop.status.name, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('${stop.scheduledTime} • ${stop.studentCount} students', style: const TextStyle(color: AppColors.textMuted)),
                    if (stop.status == StopStatus.current) ...[
                      const SizedBox(height: 10),
                      FilledButton.icon(
                        style: FilledButton.styleFrom(backgroundColor: AppColors.accentBlue),
                        onPressed: () {/* launch external navigation */},
                        icon: const Icon(Icons.navigation),
                        label: const Text('Navigate'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _icon(StopStatus s) => switch (s) {
        StopStatus.completed => Icons.check,
        StopStatus.current => Icons.location_on,
        StopStatus.pending => Icons.home_outlined,
      };
}
