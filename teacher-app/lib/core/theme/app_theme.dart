import 'package:flutter/material.dart';

/// ShuleCloud Teacher palette — "Professional Trust Blue" + "Growth Emerald".
class AppColors {
  AppColors._();
  static const Color primary = Color(0xFF2563EB);           // Trust Blue
  static const Color primaryContainer = Color(0xFF1A73E8);
  static const Color onPrimary = Colors.white;
  static const Color secondary = Color(0xFF10B981);          // Growth Emerald
  static const Color secondaryContainer = Color(0xFF34A853);
  static const Color tertiary = Color(0xFFF59E0B);           // Amber accent
  static const Color error = Color(0xFFBA1A1A);

  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceContainerLowest = Color(0xFFFFFFFF);
  static const Color surfaceContainerLow = Color(0xFFF2F3FD);
  static const Color surfaceContainer = Color(0xFFECEDF7);
  static const Color surfaceContainerHigh = Color(0xFFE6E8F2);

  static const Color onSurface = Color(0xFF0D1B2A);          // deep navy, not pure black
  static const Color onSurfaceVariant = Color(0xFF414754);
  static const Color outline = Color(0xFF727785);
  static const Color outlineVariant = Color(0xFFC1C6D6);

  // Dark mode base — deep charcoal, not pure black (DESIGN.md).
  static const Color darkBackground = Color(0xFF0B0E14);
}

class AppTheme {
  AppTheme._();

  static ThemeData get light => _build(Brightness.light);
  static ThemeData get dark => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: brightness,
    ).copyWith(
      primary: AppColors.primary,
      secondary: AppColors.secondary,
      tertiary: AppColors.tertiary,
      error: AppColors.error,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: isDark ? AppColors.darkBackground : AppColors.background,
      // No custom fontFamily is set — Inter isn't bundled, and a declared-but-
      // missing family can render blank glyphs on some devices. Platform default
      // (Roboto) always renders.
      //
      // IMPORTANT: every style below has an EXPLICIT color. In Material 3, a
      // custom TextTheme that omits `color` does NOT inherit onSurface for the
      // overridden styles — it resolves to a near-invisible color. This was the
      // root cause of an entire class of "empty card" bugs in the sibling apps.
      // Do not remove these colors.
      textTheme: TextTheme(
        headlineLarge: TextStyle(fontWeight: FontWeight.w800, fontSize: 28, height: 1.28, color: isDark ? Colors.white : AppColors.onSurface),
        titleLarge: TextStyle(fontWeight: FontWeight.w700, fontSize: 22, height: 1.27, color: isDark ? Colors.white : AppColors.onSurface),
        titleMedium: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: isDark ? Colors.white : AppColors.onSurface),
        bodyLarge: TextStyle(fontSize: 18, height: 1.55, color: isDark ? Colors.white : AppColors.onSurface),
        bodyMedium: TextStyle(fontSize: 16, height: 1.5, color: isDark ? Colors.white : AppColors.onSurface),
        labelMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: isDark ? Colors.white70 : AppColors.onSurfaceVariant),
        labelSmall: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: isDark ? Colors.white70 : AppColors.onSurfaceVariant),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: isDark ? AppColors.darkBackground : AppColors.background,
        foregroundColor: AppColors.primary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: const TextStyle(
          color: AppColors.primary,
          fontSize: 22,
          fontWeight: FontWeight.w800,
        ),
      ),
      // NOTE: newer Flutter Material uses CardThemeData (NOT CardTheme). Using
      // CardTheme here is a hard compile error.
      cardTheme: CardThemeData(
        color: isDark ? const Color(0xFF171B24) : AppColors.surfaceContainerLowest,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        margin: EdgeInsets.zero,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.primary),
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        side: BorderSide.none,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? const Color(0xFF1B2130) : AppColors.surfaceContainer,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: isDark ? const Color(0xFF12151F) : Colors.white,
        indicatorColor: AppColors.primary.withValues(alpha: 0.16),
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        ),
        height: 72,
      ),
    );
  }
}
