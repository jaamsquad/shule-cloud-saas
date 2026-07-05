import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/error/failures.dart';
import '../core/utils/result.dart';
import '../models/driver.dart';
import 'providers.dart';

/// Auth state: the current driver (null = signed out) with loading/error flags.
class AuthState {
  final Driver? driver;
  final bool loading;
  final Failure? error;
  const AuthState({this.driver, this.loading = false, this.error});

  AuthState copyWith({Driver? driver, bool? loading, Failure? error, bool clearError = false}) => AuthState(
        driver: driver ?? this.driver,
        loading: loading ?? this.loading,
        error: clearError ? null : (error ?? this.error),
      );

  bool get isAuthenticated => driver != null;
}

class AuthController extends StateNotifier<AuthState> {
  final Ref _ref;
  AuthController(this._ref) : super(const AuthState());

  Future<void> bootstrap() async {
    final driver = await _ref.read(authRepoProvider).tryAutoLogin();
    state = state.copyWith(driver: driver);
  }

  Future<bool> login(String schoolCode, String identifier, String password) async {
    state = state.copyWith(loading: true, clearError: true);
    final Result<Driver> res = await _ref.read(authRepoProvider).login(
          schoolCode: schoolCode,
          identifier: identifier,
          password: password,
        );
    return res.when(
      success: (d) {
        state = state.copyWith(driver: d, loading: false);
        return true;
      },
      failure: (f) {
        state = state.copyWith(loading: false, error: f);
        return false;
      },
    );
  }

  Future<void> logout() async {
    await _ref.read(authRepoProvider).logout();
    _ref.read(socketProvider).dispose();
    state = const AuthState();
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) => AuthController(ref));
