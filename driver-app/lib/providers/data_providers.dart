import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/route_stop.dart';
import '../models/student.dart';
import '../models/app_notification.dart';
import 'providers.dart';

/// Today's route (auto-fetched, refreshable via ref.invalidate).
final todayRouteProvider = FutureProvider<BusRoute>(
  (ref) => ref.read(tripRepoProvider).todayRoute(),
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

  Future<void> board(String id) async {
    _patch(id, BoardingStatus.boarded);
    try {
      await _ref.read(studentRepoProvider).board(id);
    } catch (_) {
      _patch(id, BoardingStatus.waiting); // revert on failure
      rethrow;
    }
  }

  Future<void> drop(String id) async {
    _patch(id, BoardingStatus.dropped);
    try {
      await _ref.read(studentRepoProvider).drop(id);
    } catch (_) {
      _patch(id, BoardingStatus.boarded);
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
