import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/parent.dart';
import '../models/student.dart';
import 'providers.dart';

/// Auth + student-selection state. The selected student drives the whole app.
class AuthState {
  final Parent? parent;
  final List<Student> students;
  final String? selectedStudentId;
  final bool loading;

  const AuthState({this.parent, this.students = const [], this.selectedStudentId, this.loading = false});

  bool get isAuthenticated => parent != null;
  Student? get selected {
    if (students.isEmpty) return null;
    return students.firstWhere((s) => s.id == selectedStudentId, orElse: () => students.first);
  }

  AuthState copyWith({Parent? parent, List<Student>? students, String? selectedStudentId, bool? loading}) =>
      AuthState(
        parent: parent ?? this.parent,
        students: students ?? this.students,
        selectedStudentId: selectedStudentId ?? this.selectedStudentId,
        loading: loading ?? this.loading,
      );
}

class AuthController extends StateNotifier<AuthState> {
  final Ref _ref;
  AuthController(this._ref) : super(const AuthState());

  Future<void> bootstrap() async {
    final res = await _ref.read(authRepoProvider).tryAutoLogin();
    if (res != null) {
      final sel = await _ref.read(storageProvider).selectedStudentId;
      state = state.copyWith(
        parent: res.parent,
        students: res.students,
        selectedStudentId: sel ?? (res.students.isNotEmpty ? res.students.first.id : null),
      );
    }
  }

  Future<void> login({required String schoolCode, required String identifier, required String password, bool rememberMe = true}) async {
    state = state.copyWith(loading: true);
    try {
      final res = await _ref.read(authRepoProvider).login(
            schoolCode: schoolCode, identifier: identifier, password: password, rememberMe: rememberMe,
          );
      state = AuthState(
        parent: res.parent,
        students: res.students,
        selectedStudentId: res.students.isNotEmpty ? res.students.first.id : null,
      );
    } finally {
      state = state.copyWith(loading: false);
    }
  }

  Future<void> selectStudent(String id) async {
    await _ref.read(storageProvider).saveSelectedStudentId(id);
    state = state.copyWith(selectedStudentId: id);
  }

  Future<void> logout() async {
    await _ref.read(authRepoProvider).logout();
    state = const AuthState();
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) => AuthController(ref));

/// The currently-selected student (null-safe convenience).
final selectedStudentProvider = Provider<Student?>((ref) => ref.watch(authControllerProvider).selected);
