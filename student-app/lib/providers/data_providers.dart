import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import 'providers.dart';

final summaryProvider = FutureProvider.autoDispose<PortalSummary>((ref) => ref.read(dataRepoProvider).summary());
final calendarProvider = FutureProvider.autoDispose<AcademicCalendar>((ref) => ref.read(dataRepoProvider).calendar());
final examResultsProvider = FutureProvider.autoDispose<List<ExamResult>>((ref) => ref.read(dataRepoProvider).examResults());
final timetableProvider = FutureProvider.autoDispose<Timetable>((ref) => ref.read(dataRepoProvider).timetable());

/// type: 'assignment' | 'homework'
final tasksProvider = FutureProvider.autoDispose.family<List<TaskItem>, String>((ref, type) => ref.read(dataRepoProvider).tasks(type));

final resourcesProvider = FutureProvider.autoDispose<List<Resource>>((ref) => ref.read(dataRepoProvider).resources());
final feesProvider = FutureProvider.autoDispose<FeesSummary>((ref) => ref.read(dataRepoProvider).fees());
final receiptsProvider = FutureProvider.autoDispose<List<Receipt>>((ref) => ref.read(dataRepoProvider).receipts());
final walletProvider = FutureProvider.autoDispose<StudentWallet>((ref) => ref.read(dataRepoProvider).wallet());
