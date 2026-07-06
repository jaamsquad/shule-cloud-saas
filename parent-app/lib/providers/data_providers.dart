import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/academics.dart';
import '../models/attendance.dart';
import '../models/fees.dart';
import '../models/homework.dart';
import '../models/misc_models.dart';
import '../models/timetable.dart';
import 'auth_provider.dart';
import 'providers.dart';

/// The id of the currently-selected student (used to key the data providers so
/// switching child re-fetches everything).
final _sid = Provider<String>((ref) => ref.watch(selectedStudentProvider)?.id ?? '');

final attendanceProvider = FutureProvider<AttendanceSummary>((ref) {
  final id = ref.watch(_sid);
  return ref.read(dataRepoProvider).attendance(id);
});

final resultsProvider = FutureProvider<ResultsSummary>((ref) {
  final id = ref.watch(_sid);
  return ref.read(dataRepoProvider).results(id);
});

final homeworkProvider = FutureProvider<List<Homework>>((ref) {
  final id = ref.watch(_sid);
  return ref.read(dataRepoProvider).homework(id);
});

final timetableProvider = FutureProvider<List<Lesson>>((ref) {
  final id = ref.watch(_sid);
  return ref.read(dataRepoProvider).timetable(id);
});

final feesProvider = FutureProvider<FeesSummary>((ref) {
  final id = ref.watch(_sid);
  return ref.read(dataRepoProvider).fees(id);
});

final libraryProvider = FutureProvider<LibrarySummary>((ref) {
  final id = ref.watch(_sid);
  return ref.read(dataRepoProvider).library(id);
});

final messagesProvider = FutureProvider<List<MessageThread>>((ref) {
  return ref.read(dataRepoProvider).messages();
});

final announcementsProvider = FutureProvider<List<Announcement>>((ref) {
  return ref.read(dataRepoProvider).announcements();
});

final calendarProvider = FutureProvider<List<CalendarEvent>>((ref) {
  return ref.read(dataRepoProvider).calendar();
});

final busProvider = FutureProvider<BusStatus>((ref) {
  final id = ref.watch(_sid);
  return ref.read(dataRepoProvider).bus(id);
});

final summaryProvider = FutureProvider<Map<String, dynamic>>((ref) {
  final id = ref.watch(_sid);
  return ref.read(dataRepoProvider).summary(id);
});
