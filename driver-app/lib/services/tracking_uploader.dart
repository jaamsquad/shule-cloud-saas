import 'package:dio/dio.dart';
import '../core/constants/app_constants.dart';
import '../models/gps_point.dart';
import 'gps_queue.dart';

/// Uploads GPS points to the tracker endpoint. On failure the point is queued
/// locally; a background flush drains the queue in batches once online.
class TrackingUploader {
  final Dio _dio;
  final GpsQueue _queue;
  TrackingUploader(this._dio, this._queue);

  /// Try to send [point] immediately; queue it if the request fails.
  Future<void> submit(GpsPoint point) async {
    try {
      await _dio.post(ApiConfig.trackerLocation, data: point.toJson());
      // Opportunistically drain anything that piled up while offline.
      await flush();
    } catch (_) {
      await _queue.add(point);
    }
  }

  /// Flush queued points in batches. Stops on the first failure (keeps order).
  Future<void> flush() async {
    while (_queue.length > 0) {
      final batch = _queue.peek(TrackingConfig.batchFlushSize);
      if (batch.isEmpty) break;
      try {
        await _dio.post(ApiConfig.trackerBatch, data: {
          'points': batch.map((p) => p.toJson()).toList(),
        });
        await _queue.removeFirst(batch.length);
      } catch (_) {
        break; // stay offline; retry next tick
      }
    }
  }
}
