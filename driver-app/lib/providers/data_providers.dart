import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/route_stop.dart';
import '../models/student.dart';
import '../models/app_notification.dart';
import 'providers.dart';

/// Raised when a board/drop action violates the trip's boarding rules.
class BoardingRuleError implements Exception {
  final String message;
  const BoardingRuleError(this.message);
  @override
  String toString() => message;
}

/// Today's route (auto-fetched, refreshable via ref.invalidate).
final todayRouteProvider = FutureProvider<BusRoute>(
  (ref) => ref.read(tripRepoProvider).todayRoute(),
);

/// ALL zones/routes the driver serves — used when a driver covers more than one.
final driverRoutesProvider = FutureProvider<List<BusRoute>>(
  (ref) => ref.read(tripRepoProvider).allRoutes(),
);

/// Students on today's route, with local board/drop mutations reflected optimistically.
class StudentsController extends StateNotifier<AsyncValue<List<Student>>> {
  final Ref _ref;
  StudentsController(this._ref) : super(const AsyncValue.loading()) {
    load();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    try {
      final list = await _ref.read(studentRepoProvider).todayStudents();
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Board a student. Enforces the trip rules:
  ///   • a student already boarded cannot be boarded again;
  ///   • a student already dropped cannot be boarded again this trip.
  /// Throws [BoardingRuleError] with a message the UI shows.
  Future<void> board(String id) async {
    final s = state.valueOrNull?.where((x) => x.id == id).firstOrNull;
    if (s != null) {
      if (s.status == BoardingStatus.boarded) throw const BoardingRuleError('Already boarded.');
      if (s.status == BoardingStatus.dropped) throw const BoardingRuleError('Already dropped — cannot board again this trip.');
    }
    final prev = s?.status ?? BoardingStatus.waiting;
    _patch(id, BoardingStatus.boarded);
    try {
      await _ref.read(studentRepoProvider).board(id);
    } catch (_) {
      _patch(id, prev); // revert on failure
      rethrow;
    }
  }

  /// Drop a student. Must be boarded first.
  Future<void> drop(String id) async {
    final s = state.valueOrNull?.where((x) => x.id == id).firstOrNull;
    if (s != null) {
      if (s.status == BoardingStatus.dropped) throw const BoardingRuleError('Already dropped.');
      if (s.status != BoardingStatus.boarded) throw const BoardingRuleError('Board the student before dropping.');
    }
    final prev = s?.status ?? BoardingStatus.boarded;
    _patch(id, BoardingStatus.dropped);
    try {
      await _ref.read(studentRepoProvider).drop(id);
    } catch (_) {
      _patch(id, prev);
      rethrow;
    }
  }

  void _patch(String id, BoardingStatus status) {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncValue.data([
      for (final s in current) s.id == id ? s.copyWith(status: status) : s,
    ]);
  }
}

final studentsControllerProvider =
    StateNotifierProvider<StudentsController, AsyncValue<List<Student>>>(
  (ref) => StudentsController(ref),
);

/// Notifications for the Alerts screen.
final notificationsProvider = FutureProvider<List<AppNotification>>(
  (ref) => ref.read(safetyRepoProvider).notifications(),
);
