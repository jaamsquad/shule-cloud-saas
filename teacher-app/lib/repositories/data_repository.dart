import 'package:dio/dio.dart';
import '../core/constants/app_constants.dart';
import '../models/staff.dart';
import '../models/student.dart';
import '../models/exam.dart';
import '../models/content_item.dart';
import '../models/timetable.dart';

/// Central data repository — one thin wrapper per backend endpoint. Deliberately
/// flat rather than split into many repository classes: the whole app's surface
/// is the single `/auth/staff-portal/*` API, so one class mirrors that reality.
class DataRepository {
  final Dio _dio;
  DataRepository(this._dio);

  // ── Dashboard ────────────────────────────────────────────────────────────
  Future<DashboardSummary> summary() async {
    final r = await _dio.get(ApiConfig.summary);
    return DashboardSummary.fromJson(Map<String, dynamic>.from(r.data as Map));
  }

  Future<List<Announcement>> announcements() async {
    final r = await _dio.get(ApiConfig.announcements);
    final list = (r.data is List) ? r.data as List : (r.data['data'] as List? ?? []);
    return list.map((e) => Announcement.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  // ── Classes ──────────────────────────────────────────────────────────────
  Future<List<ClassAssignment>> myClasses() async {
    final r = await _dio.get(ApiConfig.myClasses);
    final list = (r.data is List) ? r.data as List : (r.data['data'] as List? ?? []);
    return list.map((e) => ClassAssignment.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<List<ClassAssignment>> assignmentsScope() async {
    final r = await _dio.get(ApiConfig.assignmentsScope);
    final data = Map<String, dynamic>.from(r.data as Map);
    final list = (data['assignments'] as List?) ?? (r.data is List ? r.data as List : []);
    return list.map((e) => ClassAssignment.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  // ── Timetable ────────────────────────────────────────────────────────────
  Future<TimetableGrid> timetable() async {
    final r = await _dio.get(ApiConfig.timetable);
    return TimetableGrid.fromJson(Map<String, dynamic>.from(r.data as Map));
  }

  // ── Attendance ───────────────────────────────────────────────────────────
  Future<List<StudentLite>> attendanceRoster({required String className, String? subject, required String date}) async {
    final r = await _dio.get(ApiConfig.attendance, queryParameters: {
      'className': className, if (subject != null) 'subject': subject, 'date': date,
    });
    final list = (r.data is List) ? r.data as List : (r.data['data'] as List? ?? []);
    return list.map((e) => StudentLite.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<void> saveAttendance({required String className, String? subject, required String date, required List<Map<String, String>> records}) =>
      _dio.post(ApiConfig.attendance, data: {'className': className, if (subject != null) 'subject': subject, 'date': date, 'records': records});

  // ── Exams / Marks / Gradebook ────────────────────────────────────────────
  Future<List<ExamLite>> exams() async {
    final r = await _dio.get(ApiConfig.exams);
    final list = (r.data is List) ? r.data as List : (r.data['data'] as List? ?? []);
    return list.map((e) => ExamLite.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<List<RosterMark>> roster({required String examId, required String className, required String subject}) async {
    final r = await _dio.get(ApiConfig.roster, queryParameters: {'examId': examId, 'className': className, 'subject': subject});
    final list = (r.data is List) ? r.data as List : (r.data['data'] as List? ?? []);
    return list.map((e) => RosterMark.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<void> saveMarks({
    required String examId, required String examName, required String className, required String subject,
    String? term, required double outOf, required List<Map<String, dynamic>> marks,
  }) =>
      _dio.post(ApiConfig.marks, data: {
        'examId': examId, 'examName': examName, 'className': className, 'subject': subject,
        if (term != null) 'term': term, 'outOf': outOf, 'marks': marks,
      });

  Future<MarksStatus> marksStatus({required String examId, required String subject}) async {
    final r = await _dio.get(ApiConfig.marksStatus, queryParameters: {'examId': examId, 'subject': subject});
    return MarksStatus.fromJson(Map<String, dynamic>.from(r.data as Map));
  }

  Future<void> submitMarks({required String examId, required String examName, required String className, required String subject, String? note}) =>
      _dio.post(ApiConfig.marksSubmit, data: {
        'examId': examId, 'examName': examName, 'className': className, 'subject': subject, if (note != null) 'note': note,
      });

  // ── Content: lesson plans / schemes / resources / assignments / homework ──
  Future<List<ContentItem>> content(String type) async {
    final r = await _dio.get(ApiConfig.content(type));
    final list = (r.data is List) ? r.data as List : (r.data['data'] as List? ?? []);
    return list.map((e) => ContentItem.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<void> createContent(String type, Map<String, dynamic> body) => _dio.post(ApiConfig.content(type), data: body);
  Future<void> updateContent(String type, String id, Map<String, dynamic> body) => _dio.patch(ApiConfig.contentItem(type, id), data: body);
  Future<void> deleteContent(String type, String id) => _dio.delete(ApiConfig.contentItem(type, id));

  Future<List<Submission>> submissions(String type, String id) async {
    final r = await _dio.get(ApiConfig.submissions(type, id));
    final data = Map<String, dynamic>.from(r.data as Map);
    final list = (data['submissions'] as List?) ?? [];
    return list.map((e) => Submission.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<void> gradeSubmission(String submissionId, {required double marks, String? feedback}) =>
      _dio.post(ApiConfig.gradeSubmission(submissionId), data: {'marks': marks, if (feedback != null) 'feedback': feedback});

  // ── Messaging (teacher → parent) ────────────────────────────────────────
  Future<Map<String, dynamic>> messageParentsClasses() async {
    final r = await _dio.get(ApiConfig.messageParentsStudents);
    return Map<String, dynamic>.from(r.data as Map);
  }

  Future<void> messageParents({required String message, String? className, List<String>? studentIds}) =>
      _dio.post(ApiConfig.messageParents, data: {'message': message, if (className != null) 'className': className, if (studentIds != null) 'studentIds': studentIds});

  Future<List<dynamic>> messageParentsHistory() async {
    final r = await _dio.get(ApiConfig.messageParentsHistory);
    return (r.data is List) ? r.data as List : (r.data['data'] as List? ?? []);
  }

  // ── Leave ────────────────────────────────────────────────────────────────
  Future<void> requestLeave({required String type, required String startDate, required String endDate, required String reason}) =>
      _dio.post(ApiConfig.leaveRequests, data: {'type': type, 'startDate': startDate, 'endDate': endDate, 'reason': reason});

  Future<List<dynamic>> leaveRequests() async {
    final r = await _dio.get(ApiConfig.leaveRequests);
    return (r.data is List) ? r.data as List : (r.data['data'] as List? ?? []);
  }

  // ── Behaviour (ungated backend endpoints — used read/write with caution) ──
  Future<List<dynamic>> behaviourTraits() async {
    final r = await _dio.get(ApiConfig.behaviourTraits);
    return (r.data is List) ? r.data as List : (r.data['data'] as List? ?? []);
  }

  Future<void> recordObservations(List<Map<String, dynamic>> records) => _dio.post(ApiConfig.observationsBulk, data: {'records': records});

  // ── Library (ungated admin endpoints) ───────────────────────────────────
  Future<List<dynamic>> libraryBooks({String? search}) async {
    final r = await _dio.get(ApiConfig.libraryBooks, queryParameters: {if (search != null) 'search': search});
    return (r.data is List) ? r.data as List : (r.data['data'] as List? ?? []);
  }

  Future<List<dynamic>> libraryIssues() async {
    final r = await _dio.get(ApiConfig.libraryIssues);
    return (r.data is List) ? r.data as List : (r.data['data'] as List? ?? []);
  }
}
