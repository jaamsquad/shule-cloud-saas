import 'package:hive/hive.dart';
import '../core/constants/app_constants.dart';
import '../models/gps_point.dart';

/// Durable offline queue for GPS points. When the network is down, points are
/// appended here and flushed (in FIFO order) once connectivity returns — so
/// tracking data is never lost.
class GpsQueue {
  Box<GpsPoint> get _box => Hive.box<GpsPoint>(StorageKeys.gpsQueueBox);

  Future<void> add(GpsPoint p) => _box.add(p);

  int get length => _box.length;

  /// Peek the oldest [count] points (without removing them).
  List<GpsPoint> peek(int count) {
    final n = count.clamp(0, _box.length);
    return _box.values.take(n).toList(growable: false);
  }

  /// Remove the oldest [count] points after a successful upload.
  Future<void> removeFirst(int count) async {
    final keys = _box.keys.take(count).toList();
    await _box.deleteAll(keys);
  }

  Future<void> clear() => _box.clear();
}
