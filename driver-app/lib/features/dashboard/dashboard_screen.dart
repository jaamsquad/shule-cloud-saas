import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:battery_plus/battery_plus.dart';
import '../../core/theme/app_theme.dart';
import '../../models/trip.dart';
import '../../providers/auth_provider.dart';
import '../../providers/trip_provider.dart';
import '../../providers/settings_provider.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/status_chip.dart';

/// Driver home: profile, current trip, live status, and quick actions.
class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});
  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  int _battery = 100;

  @override
  void initState() {
    super.initState();
    Battery().batteryLevel.then((v) => mounted ? setState(() => _battery = v) : null);
  }

  Future<void> _startTrip() async {
    final inspectionRequired = ref.read(settingsControllerProvider).inspectionRequired;
    if (inspectionRequired) {
      final done = await context.push<bool>('/inspection');
      if (done != true) return;
    }
    final driver = ref.read(authControllerProvider).driver;
    try {
      await ref.read(tripControllerProvider.notifier).start(driver?.routeId ?? '');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    final driver = ref.watch(authControllerProvider).driver;
    final trip = ref.watch(tripControllerProvider);
    final online = ref.watch(onlineStatusProvider).valueOrNull ?? true;
    final tc = ref.read(tripControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.primary.withValues(alpha: 0.15),
              backgroundImage: driver?.photoUrl != null ? NetworkImage(driver!.photoUrl!) : null,
              child: driver?.photoUrl == null ? const Icon(Icons.person, color: AppColors.primary, size: 20) : null,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(driver?.name ?? 'Driver', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.primary)),
                  Text('${driver?.busPlate ?? 'Bus'} • ${driver?.routeName ?? 'Route'}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                ],
              ),
            ),
            Icon(Icons.sensors, color: online ? AppColors.primary : AppColors.textMuted),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(onlineStatusProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Current route banner
            AppCard(
              child: Row(
                children: [
                  Container(width: 4, height: 44, color: AppColors.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(driver?.routeName ?? 'Route', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                        const Text('Morning Student Pickup', style: TextStyle(color: AppColors.textMuted)),
                      ],
                    ),
                  ),
                  Text(trip.state.label, style: TextStyle(color: trip.state.isRunning ? AppColors.primary : AppColors.textMuted, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Live status chips
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                StatusChip(icon: Icons.location_on, label: trip.state.isRunning ? 'GPS Active' : 'GPS Idle', color: trip.state.isRunning ? AppColors.primary : AppColors.textMuted),
                StatusChip(icon: Icons.wifi, label: online ? 'Online' : 'Offline', color: online ? AppColors.accentBlue : AppColors.warning),
                StatusChip(icon: Icons.battery_full, label: '$_battery%', color: _battery < 20 ? AppColors.danger : AppColors.primary),
              ],
            ),
            const SizedBox(height: 16),

            // Primary trip control
            _PrimaryTripButton(trip: trip, onStart: _startTrip, onEnd: tc.end),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: ActionTile(icon: Icons.play_arrow, label: 'Resume', color: AppColors.accentBlue, filled: false, onTap: tc.canResume ? tc.resume : null)),
                const SizedBox(width: 12),
                Expanded(child: ActionTile(icon: Icons.pause_circle_outline, label: 'Pause', color: AppColors.textMuted, filled: false, onTap: tc.canPause ? tc.pause : null)),
              ],
            ),
            const SizedBox(height: 20),

            const Text('Safety & Ops', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: ActionTile(icon: Icons.emergency, label: 'SOS', color: AppColors.danger, onTap: () => context.push('/sos'))),
                const SizedBox(width: 12),
                Expanded(child: ActionTile(icon: Icons.people, label: 'Student List', color: AppColors.accentBlue, onTap: () => context.go('/students'))),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: ActionTile(icon: Icons.qr_code_scanner, label: 'Scan Card', color: AppColors.primary, filled: false, onTap: () => context.push('/scan'))),
                const SizedBox(width: 12),
                Expanded(child: ActionTile(icon: Icons.report_problem_outlined, label: 'Incident', color: AppColors.warning, filled: false, onTap: () => context.push('/incident'))),
              ],
            ),
            const SizedBox(height: 12),
            ActionTile(icon: Icons.route, label: 'Today\'s Route', color: AppColors.primary, filled: false, onTap: () => context.push('/route')),
          ],
        ),
      ),
    );
  }
}

class _PrimaryTripButton extends StatelessWidget {
  final Trip trip;
  final VoidCallback onStart;
  final VoidCallback onEnd;
  const _PrimaryTripButton({required this.trip, required this.onStart, required this.onEnd});

  @override
  Widget build(BuildContext context) {
    final running = trip.state == TripState.started || trip.state == TripState.paused;
    return SizedBox(
      height: 130,
      child: FilledButton(
        style: FilledButton.styleFrom(backgroundColor: running ? AppColors.danger : AppColors.primary),
        onPressed: running ? onEnd : onStart,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(running ? Icons.stop_circle_outlined : Icons.play_circle_outline, size: 44, color: Colors.white),
            const SizedBox(height: 6),
            Text(running ? 'End Current Trip' : 'Start Trip', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
          ],
        ),
      ),
    );
  }
}
