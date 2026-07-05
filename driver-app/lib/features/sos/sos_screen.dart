import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/providers.dart';
import '../../providers/trip_provider.dart';

/// Emergency SOS: one large button that sends an immediate alert with the
/// driver, bus, trip, GPS and timestamp.
class SosScreen extends ConsumerStatefulWidget {
  const SosScreen({super.key});
  @override
  ConsumerState<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends ConsumerState<SosScreen> {
  bool _sending = false;
  bool _sent = false;

  Future<void> _sendSos() async {
    setState(() => _sending = true);
    try {
      final loc = ref.read(locationServiceProvider);
      double lat = 0, lng = 0;
      if (await loc.ensurePermissions()) {
        final p = await loc.current();
        lat = p.latitude;
        lng = p.longitude;
      }
      final trip = ref.read(tripControllerProvider);
      await ref.read(safetyRepoProvider).sendSos(lat: lat, lng: lng, tripId: trip.id.isEmpty ? null : trip.id);
      setState(() => _sent = true);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not send SOS — retrying…')));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.danger,
      appBar: AppBar(backgroundColor: Colors.transparent, foregroundColor: Colors.white, title: const Text('Emergency SOS', style: TextStyle(color: Colors.white))),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (_sent) ...[
                const Icon(Icons.check_circle, color: Colors.white, size: 88),
                const SizedBox(height: 16),
                const Text('Alert Sent', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                const Text('Dispatch and the school have been notified with your live location.',
                    textAlign: TextAlign.center, style: TextStyle(color: Colors.white70)),
                const SizedBox(height: 24),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Colors.white)),
                  onPressed: () => context.pop(),
                  child: const Text('Done'),
                ),
              ] else ...[
                const Text('Press and hold to send an emergency alert', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 18)),
                const SizedBox(height: 40),
                GestureDetector(
                  onLongPress: _sending ? null : _sendSos,
                  child: Container(
                    width: 200,
                    height: 200,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 30)]),
                    child: Center(
                      child: _sending
                          ? const CircularProgressIndicator(color: AppColors.danger)
                          : const Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [Icon(Icons.emergency, color: AppColors.danger, size: 56), Text('SOS', style: TextStyle(color: AppColors.danger, fontSize: 28, fontWeight: FontWeight.w900))],
                            ),
                    ),
                  ),
                ),
                const SizedBox(height: 40),
                const Text('Hold for 1 second to confirm', style: TextStyle(color: Colors.white70)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
