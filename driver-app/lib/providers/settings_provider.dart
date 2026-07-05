import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers.dart';

/// App preferences: theme mode, language, inspection-required toggle.
class SettingsState {
  final ThemeMode themeMode;
  final String language;
  final bool inspectionRequired;
  const SettingsState({
    this.themeMode = ThemeMode.light,
    this.language = 'en',
    this.inspectionRequired = true,
  });

  SettingsState copyWith({ThemeMode? themeMode, String? language, bool? inspectionRequired}) =>
      SettingsState(
        themeMode: themeMode ?? this.themeMode,
        language: language ?? this.language,
        inspectionRequired: inspectionRequired ?? this.inspectionRequired,
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
}

final settingsControllerProvider =
    StateNotifierProvider<SettingsController, SettingsState>((ref) => SettingsController(ref));
