import 'package:dio/dio.dart';
import '../core/constants/app_constants.dart';
import '../models/academics.dart';
import '../models/attendance.dart';
import '../models/fees.dart';
import '../models/homework.dart';
import '../models/misc_models.dart';
import '../models/timetable.dart';
import '../services/storage_service.dart';

/// All read-only data for the selected student, cache-first so screens still
/// render offline. Each method returns typed models; on any failure it falls
/// back to the last cached JSON (or an empty model) rather than throwing to UI.
class DataRepository {
  final Dio _dio;
  final StorageService _storage;
  DataRepository(this._dio, this._storage);

  Future<Map<String, dynamic>?> _get(String path, {Map<String, dynamic>? params, String? cacheKey}) async {
    try {
      final res = await _dio.get(path, queryParameters: params);
      final data = res.data;
      if (cacheKey != null && data != null) await _storage.cache(cacheKey, data);
      return data is Map ? Map<String, dynamic>.from(data) : {'data': data};
    } catch (_) {
      if (cacheKey != null) {
        final c = _storage.readCache(cacheKey);
        if (c != null) return c is Map ? Map<String, dynamic>.from(c) : {'data': c};
      }
      return null;
    }
  }

  Future<List<dynamic>> _getList(String path, {Map<String, dynamic>? params, String? cacheKey}) async {
    try {
      final res = await _dio.get(path, queryParameters: params);
      final data = res.data;
      final list = data is List ? data : (data is Map ? (data['data'] ?? data['items'] ?? []) : []);
      if (cacheKey != null) await _storage.cache(cacheKey, list);
      return list as List;
    } catch (_) {
      if (cacheKey != null) {
        final c = _storage.readCache(cacheKey);
        if (c is List) return c;
      }
      return [];
    }
  }

  // ── Attendance ──────────────────────────────────────────────────────────────
  Future<AttendanceSummary> attendance(String studentId) async {
    final j = await _get(ApiConfig.attendance, params: {'studentId': studentId}, cacheKey: 'att_$studentId');
    return j == null ? const AttendanceSummary() : AttendanceSummary.fromJson(j);
  }

  // ── Results ─────────────────────────────────────────────────────────────────
  Future<ResultsSummary> results(String studentId) async {
    final j = await _get(ApiConfig.examResults, params: {'studentId': studentId}, cacheKey: 'res_$studentId');
    return j == null ? const ResultsSummary() : ResultsSummary.fromJson(j);
  }

  // ── Homework ────────────────────────────────────────────────────────────────
  Future<List<Homework>> homework(String studentId) async {
    final l = await _getList(ApiConfig.tasks('homework'), params: {'studentId': studentId}, cacheKey: 'hw_$studentId');
    return l.map((e) => Homework.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  // ── Timetable ───────────────────────────────────────────────────────────────
  Future<List<Lesson>> timetable(String studentId) async {
    final l = await _getList(ApiConfig.timetable, params: {'studentId': studentId}, cacheKey: 'tt_$studentId');
    return l.map((e) => Lesson.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  // ── Fees ────────────────────────────────────────────────────────────────────
  Future<FeesSummary> fees(String studentId) async {
    final j = await _get(ApiConfig.fees, params: {'studentId': studentId}, cacheKey: 'fee_$studentId');
    return j == null ? const FeesSummary() : FeesSummary.fromJson(j);
  }

  /// Start an M-PESA STK push for the outstanding balance (or [amount]).
  /// Returns { ok, message, checkoutRequestId? }.
  Future<Map<String, dynamic>> payMpesa({String? phone, double? amount}) async {
    final res = await _dio.post(ApiConfig.payMpesa, data: {
      if (phone != null) 'phone': phone,
      if (amount != null) 'amount': amount,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// Poll STK status → { status: 'pending'|'success'|'failed', message }.
  Future<Map<String, dynamic>> mpesaStatus() async {
    try {
      final res = await _dio.get(ApiConfig.mpesaStatus);
      return Map<String, dynamic>.from(res.data as Map);
    } catch (_) {
      return {'status': 'pending'};
    }
  }

  /// Payment receipts (statement).
  Future<List<Receipt>> receipts() async {
    final l = await _getList(ApiConfig.receipts, cacheKey: 'receipts');
    return l.map((e) => Receipt.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  // ── Library ─────────────────────────────────────────────────────────────────
  Future<LibrarySummary> library(String studentId) async {
    final j = await _get(ApiConfig.library, params: {'studentId': studentId}, cacheKey: 'lib_$studentId');
    return j == null ? const LibrarySummary() : LibrarySummary.fromJson(j);
  }

  // ── Messages ────────────────────────────────────────────────────────────────
  Future<List<MessageThread>> messages() async {
    final l = await _getList(ApiConfig.messages, cacheKey: 'msgs');
    return l.map((e) => MessageThread.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  // ── Announcements ───────────────────────────────────────────────────────────
  Future<List<Announcement>> announcements() async {
    final l = await _getList(ApiConfig.announcements, cacheKey: 'anns');
    return l.map((e) => Announcement.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  // ── Calendar ────────────────────────────────────────────────────────────────
  Future<List<CalendarEvent>> calendar() async {
    final l = await _getList(ApiConfig.calendar, cacheKey: 'cal');
    return l.map((e) => CalendarEvent.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  // ── Bus / transport ─────────────────────────────────────────────────────────
  Future<BusStatus> bus(String studentId) async {
    // The admin live endpoint returns { buses: [...] }; pick the student's bus if
    // the backend scopes it, else the first online bus.
    try {
      final res = await _dio.get(ApiConfig.busPosition, queryParameters: {'studentId': studentId});
      final buses = (res.data is Map ? res.data['buses'] : res.data) as List? ?? [];
      if (buses.isEmpty) return const BusStatus();
      final online = buses.firstWhere((b) => b['online'] == true, orElse: () => buses.first);
      return BusStatus.fromJson(Map<String, dynamic>.from(online as Map));
    } catch (_) {
      return const BusStatus();
    }
  }

  // ── Summary (dashboard) ─────────────────────────────────────────────────────
  Future<Map<String, dynamic>> summary(String studentId) async {
    final j = await _get(ApiConfig.summary, params: {'studentId': studentId}, cacheKey: 'sum_$studentId');
    return j ?? {};
  }
}
