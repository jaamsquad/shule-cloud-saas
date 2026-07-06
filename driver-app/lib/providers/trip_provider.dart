import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/trip.dart';
import '../services/background_tracking_service.dart';
import 'auth_provider.dart';
import 'providers.dart';

/// Owns the current [Trip] and enforces valid transitions:
///   notStarted → started → (paused ⇄ started) → completed
/// Invalid transitions (e.g. End before Start) are rejected.
class TripController extends StateNotifier<Trip> {
  final Ref _ref;
  TripController(this._ref) : super(Trip.empty);

  bool get canStart => state.state == TripState.notStarted || state.state == TripState.completed;
  bool get canPause => state.state == TripState.started;
  bool get canResume => state.state == TripState.paused;
  bool get canEnd => state.state == TripState.started || state.state == TripState.paused;

  Future<void> start(String routeId) async {
    if (!canStart) return;
    final driver = _ref.read(authControllerProvider).driver;
    if (driver == null) return;

    // Ensure we can actually track before starting.
    final ok = await _ref.read(locationServiceProvider).ensurePermissions();
    if (!ok) throw StateError('Location permission is required to start a trip.');

    final trip = await _ref.read(tripRepoProvider).start(routeId);
    state = trip.copyWith(state: TripState.started, startedAt: DateTime.now());

    await BackgroundTrackingService.startTracking(
      driverId: driver.id,
      busId: driver.busId,
      tripId: state.id,
    );
  }

  Future<void> pause() async {
    if (!canPause) return;
    // Update the UI immediately (optimistic) — the local trip state drives the
    // buttons. The backend + tracking are best-effort so a slow/failed network
    // never leaves the button feeling "stuck".
    state = state.copyWith(state: TripState.paused);
    await BackgroundTrackingService.stopTracking();
    try {
      await _ref.read(tripRepoProvider).pause(state.id);
    } catch (_) {/* keep paused locally; will reconcile on next action */}
  }

  Future<void> resume() async {
    if (!canResume) return;
    state = state.copyWith(state: TripState.started);
    final driver = _ref.read(authControllerProvider).driver;
    if (driver != null) {
      await BackgroundTrackingService.startTracking(
        driverId: driver.id,
        busId: driver.busId,
        tripId: state.id,
      );
    }
    try {
      await _ref.read(tripRepoProvider).resume(state.id);
    } catch (_) {/* keep started locally */}
  }

  Future<void> end() async {
    if (!canEnd) return;
    state = state.copyWith(state: TripState.completed, endedAt: DateTime.now());
    await BackgroundTrackingService.stopTracking();
    try {
      await _ref.read(tripRepoProvider).end(state.id);
    } catch (_) {/* trip is ended locally regardless */}
  }
}

final tripControllerProvider =
    StateNotifierProvider<TripController, Trip>((ref) => TripController(ref));
