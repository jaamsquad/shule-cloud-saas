import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/staff.dart';
import 'providers.dart';

class AuthState {
  final Staff? staff;
  final bool loading;
  const AuthState({this.staff, this.loading = false});

  bool get isAuthenticated => staff != null;

  AuthState copyWith({Staff? staff, bool? loading}) => AuthState(staff: staff ?? this.staff, loading: loading ?? this.loading);
}

class AuthController extends StateNotifier<AuthState> {
  final Ref _ref;
  AuthController(this._ref) : super(const AuthState());

  Future<void> bootstrap() async {
    final res = await _ref.read(authRepoProvider).tryAutoLogin();
    if (res != null) {
      state = state.copyWith(staff: res.staff);
      // Refresh from server in the background — never blocks the splash.
      _ref.read(authRepoProvider).fetchMe().then((s) { if (s != null) state = state.copyWith(staff: s); });
    }
  }

  Future<void> login({required String schoolCode, required String username, required String password, bool rememberMe = true}) async {
    state = state.copyWith(loading: true);
    try {
      final res = await _ref.read(authRepoProvider).login(schoolCode: schoolCode, username: username, password: password, rememberMe: rememberMe);
      state = AuthState(staff: res.staff);
    } finally {
      state = state.copyWith(loading: false);
    }
  }

  Future<void> updateContact({required String email, required String phone}) async {
    final repo = _ref.read(authRepoProvider);
    await repo.updateContact(email: email, phone: phone);
    final fresh = await repo.fetchMe();
    if (fresh != null) state = state.copyWith(staff: fresh);
  }

  Future<void> logout() async {
    await _ref.read(authRepoProvider).logout();
    state = const AuthState();
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) => AuthController(ref));
