import 'package:dio/dio.dart';
import '../core/constants/app_constants.dart';
import '../models/models.dart';

class DataRepository {
  final Dio _dio;
  DataRepository(this._dio);

  Map<String, dynamic> _obj(Response r) => r.data is Map ? Map<String, dynamic>.from(r.data as Map) : <String, dynamic>{};
  List<Map<String, dynamic>> _arr(Response r) =>
      r.data is List ? (r.data as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() : const [];

  Future<PortalSummary> summary() async => PortalSummary.fromJson(_obj(await _dio.get(ApiConfig.summary)));

  Future<AcademicCalendar> calendar() async => AcademicCalendar.fromJson(_obj(await _dio.get(ApiConfig.academicCalendar)));

  Future<List<ExamResult>> examResults() async => _arr(await _dio.get(ApiConfig.examResults)).map(ExamResult.fromJson).toList();

  Future<Timetable> timetable() async => Timetable.fromJson(_obj(await _dio.get(ApiConfig.timetable)));

  /// type: 'assignment' | 'homework'
  Future<List<TaskItem>> tasks(String type) async => _arr(await _dio.get(ApiConfig.tasks(type))).map(TaskItem.fromJson).toList();

  Future<void> submitTask(String type, String id, String answer) => _dio.post(ApiConfig.submitTask(type, id), data: {'answer': answer});

  Future<List<Resource>> resources() async => _arr(await _dio.get(ApiConfig.resources)).map(Resource.fromJson).toList();

  Future<FeesSummary> fees() async => FeesSummary.fromJson(_obj(await _dio.get(ApiConfig.fees)));

  Future<List<Receipt>> receipts() async => _arr(await _dio.get(ApiConfig.receipts)).map(Receipt.fromJson).toList();

  Future<StudentWallet> wallet() async => StudentWallet.fromJson(_obj(await _dio.get(ApiConfig.wallet)));

  /// Sends an M-PESA STK prompt; returns the checkout id to poll.
  Future<String> payFeesMpesa({required String phone, required double amount}) async {
    final r = _obj(await _dio.post(ApiConfig.payMpesa, data: {'phone': phone, 'amount': amount}));
    return (r['checkoutRequestId'] ?? '').toString();
  }

  Future<String> topUpWallet({required String phone, required double amount}) async {
    final r = _obj(await _dio.post(ApiConfig.walletTopup, data: {'phone': phone, 'amount': amount}));
    return (r['checkoutRequestId'] ?? '').toString();
  }

  /// 'completed' | 'failed' | 'pending' | 'unknown'
  Future<String> mpesaStatus(String checkoutRequestId) async {
    final r = _obj(await _dio.get(ApiConfig.mpesaStatus, queryParameters: {'checkoutRequestId': checkoutRequestId}));
    return (r['status'] ?? 'pending').toString().toLowerCase();
  }

  Future<String> payFeesFromWallet() async {
    final r = _obj(await _dio.post(ApiConfig.walletPayFees));
    return (r['message'] ?? 'Payment made from wallet').toString();
  }
}
