import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/staff.dart';
import '../models/student.dart';
import '../models/exam.dart';
import '../models/content_item.dart';
import '../models/timetable.dart';
import 'providers.dart';

final summaryProvider = FutureProvider.autoDispose<DashboardSummary>((ref) => ref.read(dataRepoProvider).summary());

final announcementsProvider = FutureProvider.autoDispose<List<Announcement>>((ref) => ref.read(dataRepoProvider).announcements());

final myClassesProvider = FutureProvider.autoDispose<List<ClassAssignment>>((ref) => ref.read(dataRepoProvider).myClasses());

final assignmentsScopeProvider = FutureProvider.autoDispose<List<ClassAssignment>>((ref) => ref.read(dataRepoProvider).assignmentsScope());

final timetableProvider = FutureProvider.autoDispose<TimetableGrid>((ref) => ref.read(dataRepoProvider).timetable());

final examsProvider = FutureProvider.autoDispose<List<ExamLite>>((ref) => ref.read(dataRepoProvider).exams());

/// Selected class/subject for Attendance + Marks screens — a simple pair.
class ClassSubjectSelection {
  final String className;
  final String subject;
  const ClassSubjectSelection({this.className = '', this.subject = ''});
  ClassSubjectSelection copyWith({String? className, String? subject}) =>
      ClassSubjectSelection(className: className ?? this.className, subject: subject ?? this.subject);
}

final selectedClassSubjectProvider = StateProvider<ClassSubjectSelection>((ref) => const ClassSubjectSelection());

final attendanceDateProvider = StateProvider<DateTime>((ref) => DateTime.now());

final attendanceRosterProvider = FutureProvider.autoDispose<List<StudentLite>>((ref) async {
  final sel = ref.watch(selectedClassSubjectProvider);
  final date = ref.watch(attendanceDateProvider);
  if (sel.className.isEmpty) return [];
  final ds = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  return ref.read(dataRepoProvider).attendanceRoster(className: sel.className, subject: sel.subject.isEmpty ? null : sel.subject, date: ds);
});

final selectedExamProvider = StateProvider<ExamLite?>((ref) => null);

final rosterProvider = FutureProvider.autoDispose<List<RosterMark>>((ref) async {
  final sel = ref.watch(selectedClassSubjectProvider);
  final exam = ref.watch(selectedExamProvider);
  if (sel.className.isEmpty || sel.subject.isEmpty || exam == null) return [];
  return ref.read(dataRepoProvider).roster(examId: exam.id, className: sel.className, subject: sel.subject);
});

final marksStatusProvider = FutureProvider.autoDispose<MarksStatus>((ref) async {
  final sel = ref.watch(selectedClassSubjectProvider);
  final exam = ref.watch(selectedExamProvider);
  if (sel.subject.isEmpty || exam == null) return const MarksStatus();
  return ref.read(dataRepoProvider).marksStatus(examId: exam.id, subject: sel.subject);
});

final lessonPlansProvider = FutureProvider.autoDispose<List<ContentItem>>((ref) => ref.read(dataRepoProvider).content('lesson-plans'));
final assignmentsProvider = FutureProvider.autoDispose<List<ContentItem>>((ref) => ref.read(dataRepoProvider).content('assignments'));
final homeworkProvider = FutureProvider.autoDispose<List<ContentItem>>((ref) => ref.read(dataRepoProvider).content('homework'));
final schemesProvider = FutureProvider.autoDispose<List<ContentItem>>((ref) => ref.read(dataRepoProvider).content('schemes'));
final resourcesProvider = FutureProvider.autoDispose<List<ContentItem>>((ref) => ref.read(dataRepoProvider).content('resources'));

final leaveRequestsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) => ref.read(dataRepoProvider).leaveRequests());
