import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import 'providers.dart';

class AuthState {
  final Student? student;
  final bool loading;
  const AuthState({this.student, this.loading = false});

  bool get isAuthenticated => student != null;

  AuthState copyWith({Student? student, bool? loading}) => AuthState(student: student ?? this.student, loading: loading ?? this.loading);
}

class AuthController extends StateNotifier<AuthState> {
  final Ref _ref;
  AuthController(this._ref) : super(const AuthState());

  Future<void> bootstrap() async {
    final s = await _ref.read(authRepoProvider).tryAutoLogin();
    if (s != null) {
      state = state.copyWith(student: s);
      // Refresh from the server in the background — never blocks the splash.
      _ref.read(authRepoProvider).fetchMe().then((fresh) {
        if (fresh != null) state = state.copyWith(student: fresh);
      });
    }
  }

  Future<void> login({required String schoolId, required String username, required String password, bool rememberMe = true}) async {
    state = state.copyWith(loading: true);
    try {
      final s = await _ref.read(authRepoProvider).login(schoolId: schoolId, username: username, password: password, rememberMe: rememberMe);
      state = AuthState(student: s);
      _ref.read(authRepoProvider).fetchMe().then((fresh) {
        if (fresh != null) state = state.copyWith(student: fresh);
      });
    } finally {
      state = state.copyWith(loading: false);
    }
  }

  Future<void> logout() async {
    await _ref.read(authRepoProvider).logout();
    state = const AuthState();
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) => AuthController(ref));
