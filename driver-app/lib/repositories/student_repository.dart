import 'package:dio/dio.dart';
import '../core/constants/app_constants.dart';
import '../models/student.dart';

/// Students on today's route + boarding/drop + QR lookup.
class StudentRepository {
  final Dio _dio;
  StudentRepository(this._dio);

  Future<List<Student>> todayStudents() async {
    final res = await _dio.get(ApiConfig.routeStudents);
    final list = (res.data as List?) ?? [];
    return list.map((e) => Student.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<void> board(String studentId) =>
      _dio.post(ApiConfig.boardStudent, data: {'studentId': studentId, 'at': DateTime.now().toIso8601String()});

  Future<void> drop(String studentId) =>
      _dio.post(ApiConfig.dropStudent, data: {'studentId': studentId, 'at': DateTime.now().toIso8601String()});

  Future<Student> byQr(String code) async {
    final res = await _dio.post(ApiConfig.studentByQr, data: {'code': code});
    return Student.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  /// Send an SMS to a student's parent (branded + logged for the admin).
  Future<void> messageParent(String studentId, String message) =>
      _dio.post('/driver/students/message', data: {'studentId': studentId, 'message': message});
}
