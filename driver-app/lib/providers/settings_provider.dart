import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers.dart';

/// App preferences: theme mode, language, inspection-required toggle.
class SettingsState {
  final ThemeMode themeMode;
  final String language;
  final bool inspectionRequired;
  final String boardingMode; // 'scan' | 'list'
  const SettingsState({
    this.themeMode = ThemeMode.light,
    this.language = 'en',
    this.inspectionRequired = true,
    this.boardingMode = 'scan',
  });

  bool get scanBoarding => boardingMode == 'scan';

  SettingsState copyWith({ThemeMode? themeMode, String? language, bool? inspectionRequired, String? boardingMode}) =>
      SettingsState(
        themeMode: themeMode ?? this.themeMode,
        language: language ?? this.language,
        inspectionRequired: inspectionRequired ?? this.inspectionRequired,
        boardingMode: boardingMode ?? this.boardingMode,
      );
}

class SettingsController extends StateNotifier<SettingsState> {
  final Ref _ref;
  SettingsController(this._ref) : super(const SettingsState()) {
    final s = _ref.read(storageProvider);
    state = SettingsState(
      themeMode: s.darkMode ? ThemeMode.dark : ThemeMode.light,
      language: s.language,
      inspectionRequired: s.inspectionRequired,
      boardingMode: s.boardingMode,
    );
  }

  void toggleDark(bool on) {
    _ref.read(storageProvider).darkMode = on;
    state = state.copyWith(themeMode: on ? ThemeMode.dark : ThemeMode.light);
  }

  void setLanguage(String lang) {
    _ref.read(storageProvider).language = lang;
    state = state.copyWith(language: lang);
  }

  void setInspectionRequired(bool v) {
    _ref.read(storageProvider).inspectionRequired = v;
    state = state.copyWith(inspectionRequired: v);
  }

  void setBoardingMode(String mode) {
    _ref.read(storageProvider).boardingMode = mode;
    state = state.copyWith(boardingMode: mode);
  }
}

final settingsControllerProvider =
    StateNotifierProvider<SettingsController, SettingsState>((ref) => SettingsController(ref));
