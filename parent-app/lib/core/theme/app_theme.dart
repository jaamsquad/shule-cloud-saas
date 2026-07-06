import 'package:flutter/material.dart';

/// ShuleCloud Parent palette — from DESIGN.md.
/// Growth Green (primary) + Stability Blue (secondary), "fintech-for-education".
class AppColors {
  AppColors._();
  static const Color primary = Color(0xFF006B2C);          // Growth Green
  static const Color primaryContainer = Color(0xFF00873A);
  static const Color onPrimary = Colors.white;
  static const Color secondary = Color(0xFF0051D5);         // Stability Blue
  static const Color secondaryContainer = Color(0xFF316BF3);
  static const Color tertiary = Color(0xFF825100);          // Amber (transport)
  static const Color error = Color(0xFFBA1A1A);

  static const Color background = Color(0xFFF8F9FF);
  static const Color surface = Color(0xFFF8F9FF);
  static const Color surfaceContainerLowest = Color(0xFFFFFFFF);
  static const Color surfaceContainerLow = Color(0xFFEFF4FF);
  static const Color surfaceContainer = Color(0xFFE5EEFF);
  static const Color surfaceContainerHigh = Color(0xFFDCE9FF);

  static const Color onSurface = Color(0xFF0B1C30);
  static const Color onSurfaceVariant = Color(0xFF3E4A3D);
  static const Color outline = Color(0xFF6E7B6C);
  static const Color outlineVariant = Color(0xFFBDCABA);

  // Dark mode base (deep navy, not pure black — DESIGN.md).
  static const Color darkBackground = Color(0xFF0F172A);
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
      // No custom fontFamily is set — Inter/Plus Jakarta Sans aren't bundled, and a
      // declared-but-missing family can render blank glyphs on some devices. We use
      // the platform default (Roboto), which always renders.
      //
      // IMPORTANT: every style below has an EXPLICIT color. In Material 3, a custom
      // TextTheme that omits `color` does NOT automatically inherit onSurface for the
      // overridden styles — it resolves to a near-invisible/transparent color, which
      // is exactly why cards were rendering with no visible text/icons. Do not remove
      // these colors.
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
          fontSize: 24,
          fontWeight: FontWeight.w800,
        ),
      ),
      // NOTE: Flutter's newer Material uses CardThemeData (NOT CardTheme) here.
      // Using CardTheme causes a hard compile error — this is the fix.
      cardTheme: CardThemeData(
        color: isDark ? const Color(0xFF16233B) : AppColors.surfaceContainerLowest,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        margin: EdgeInsets.zero,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.secondary,
          side: const BorderSide(color: AppColors.secondary),
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        side: BorderSide.none,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? const Color(0xFF1B2942) : AppColors.surfaceContainer,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: isDark ? const Color(0xFF12203A) : Colors.white,
        indicatorColor: AppColors.primaryContainer.withValues(alpha: 0.18),
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        ),
        height: 76,
      ),
    );
  }
}
