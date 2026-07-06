import 'package:flutter/material.dart';

/// ShuleCloud Driver palette — dark-blue transport theme.
class AppColors {
  AppColors._();
  static const Color primary = Color(0xFF10245C); // dark blue
  static const Color primaryDark = Color(0xFF0A163B);
  static const Color primaryLight = Color(0xFF1E3A8A);
  static const Color accentBlue = Color(0xFF2E6BE6);
  static const Color danger = Color(0xFFD32029);
  static const Color warning = Color(0xFFE8A400);
  static const Color success = Color(0xFF12833C);
  static const Color bg = Color(0xFFF4F6FB);
  static const Color card = Colors.white;
  static const Color textDark = Color(0xFF1B2333);
  static const Color textMuted = Color(0xFF6B7385);
  static const Color border = Color(0xFFE3E7F0);
}

/// Material 3 light & dark themes.
class AppTheme {
  AppTheme._();

  static ThemeData get light => _base(Brightness.light);
  static ThemeData get dark => _base(Brightness.dark);

  static ThemeData _base(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: brightness,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: isDark ? const Color(0xFF10140F) : AppColors.bg,
      fontFamily: 'Roboto',
      appBarTheme: AppBarTheme(
        backgroundColor: isDark ? const Color(0xFF10140F) : AppColors.bg,
        foregroundColor: AppColors.primary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: const TextStyle(
          color: AppColors.primary,
          fontSize: 20,
          fontWeight: FontWeight.w800,
        ),
      ),
      cardTheme: CardThemeData(
        color: isDark ? const Color(0xFF1A211B) : AppColors.card,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? const Color(0xFF222A23) : const Color(0xFFEDF1EF),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      ),
    );
  }
}
