import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:battery_plus/battery_plus.dart';
import '../../core/theme/app_theme.dart';
import '../../models/student.dart';
import '../../models/trip.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_providers.dart';
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
      // Open the live map with turn-by-turn to the route's stops.
      if (mounted) context.push('/map');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  // Board/Drop entry point: scan a card, or open the student list — depending on
  // the "Boarding method" setting.
  void _boardDrop(String mode) {
    final scan = ref.read(settingsControllerProvider).scanBoarding;
    if (scan) {
      context.push('/scan?mode=$mode');
    } else {
      context.go('/students');
    }
  }

  // End Trip is blocked while any boarded student hasn't been dropped, so no
  // child is "left on the bus" in the records.
  Future<void> _endTrip() async {
    final students = ref.read(studentsControllerProvider).valueOrNull ?? [];
    final stillOnboard = students.where((s) => s.status == BoardingStatus.boarded).toList();
    if (stillOnboard.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('${stillOnboard.length} student(s) still boarded. Drop everyone before ending the trip.'),
        backgroundColor: AppColors.danger,
      ));
      return;
    }
    await ref.read(tripControllerProvider.notifier).end();
  }

  @override
  Widget build(BuildContext context) {
    final driver = ref.watch(authControllerProvider).driver;
    final trip = ref.watch(tripControllerProvider);
    final online = ref.watch(onlineStatusProvider).valueOrNull ?? true;
    final tc = ref.read(tripControllerProvider.notifier);

    return PortalPage(
      title: 'Dashboard',
      subtitle: '${driver?.busPlate ?? 'Bus'} · ${driver?.routeName ?? 'Route'}',
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: StatusChip(icon: Icons.sensors, label: online ? 'Online' : 'Offline', color: online ? AppColors.green : AppColors.warning),
        ),
      ],
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(onlineStatusProvider),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            // Current route banner
            AppCard(
              accent: trip.state.isRunning ? AppColors.green : AppColors.gold,
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(driver?.routeName ?? 'Route', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: AppColors.slate800)),
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
            _PrimaryTripButton(trip: trip, onStart: _startTrip, onEnd: _endTrip),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: ActionTile(icon: Icons.play_arrow, label: 'Resume', color: AppColors.accentBlue, filled: false, onTap: tc.canResume ? tc.resume : null)),
                const SizedBox(width: 12),
                Expanded(child: ActionTile(icon: Icons.pause_circle_outline, label: 'Pause', color: AppColors.textMuted, filled: false, onTap: tc.canPause ? tc.pause : null)),
              ],
            ),
            const SizedBox(height: 20),

            const SectionHeader('Safety & Operations'),
            Row(
              children: [
                Expanded(child: ActionTile(icon: Icons.emergency, label: 'SOS', color: AppColors.danger, onTap: () => context.push('/sos'))),
                const SizedBox(width: 12),
                Expanded(child: ActionTile(icon: Icons.people, label: 'Student List', color: AppColors.accentBlue, onTap: () => context.go('/students'))),
              ],
            ),
            const SizedBox(height: 12),
            // Board / Drop — either scans a card or opens the list, per the
            // "Boarding method" setting.
            Row(
              children: [
                Expanded(child: ActionTile(icon: Icons.login, label: 'Board Student', color: AppColors.primary, filled: false, onTap: () => _boardDrop('board'))),
                const SizedBox(width: 12),
                Expanded(child: ActionTile(icon: Icons.logout, label: 'Drop Student', color: AppColors.accentBlue, filled: false, onTap: () => _boardDrop('drop'))),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: ActionTile(icon: Icons.report_problem_outlined, label: 'Incident', color: AppColors.warning, filled: false, onTap: () => context.push('/incident'))),
                const SizedBox(width: 12),
                Expanded(child: ActionTile(icon: Icons.route, label: 'Today\'s Route', color: AppColors.primary, filled: false, onTap: () => context.push('/route'))),
              ],
            ),
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
      height: 120,
      child: FilledButton(
        style: FilledButton.styleFrom(
          backgroundColor: running ? AppColors.danger : AppColors.primary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLg)),
        ),
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
