import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers.dart';

class SettingsState {
  final ThemeMode themeMode;
  final String language;
  final bool biometric;
  const SettingsState({this.themeMode = ThemeMode.light, this.language = 'en', this.biometric = false});

  SettingsState copyWith({ThemeMode? themeMode, String? language, bool? biometric}) =>
      SettingsState(themeMode: themeMode ?? this.themeMode, language: language ?? this.language, biometric: biometric ?? this.biometric);
}

class SettingsController extends StateNotifier<SettingsState> {
  final Ref _ref;
  SettingsController(this._ref) : super(const SettingsState()) {
    final s = _ref.read(storageProvider);
    state = SettingsState(themeMode: s.darkMode ? ThemeMode.dark : ThemeMode.light, language: s.language, biometric: s.biometric);
  }

  void toggleDark(bool on) {
    _ref.read(storageProvider).darkMode = on;
    state = state.copyWith(themeMode: on ? ThemeMode.dark : ThemeMode.light);
  }

  void setLanguage(String lang) {
    _ref.read(storageProvider).language = lang;
    state = state.copyWith(language: lang);
  }

  void setBiometric(bool v) {
    _ref.read(storageProvider).biometric = v;
    state = state.copyWith(biometric: v);
  }
}

final settingsControllerProvider = StateNotifierProvider<SettingsController, SettingsState>((ref) => SettingsController(ref));
