import 'package:flutter/material.dart';

/// ShuleCloud Student palette — mirrors the web Student Portal
/// (frontend/src/portals/PortalShell.tsx + theme.ts): green student sidebar,
/// gold header & panel strips, light slate page, white cards.
///
/// The legacy token names (primary, secondary, onSurface…) are kept so every
/// screen picks up the new look without per-screen colour changes.
class AppColors {
  AppColors._();

  // ── Web portal brand tokens ────────────────────────────────────────────────
  static const Color accent = Color(0xFF159A52);      // PORTAL_THEME.student.accent
  static const Color accentDark = Color(0xFF0F7A40);  // PORTAL_THEME.student.accentDark
  static const Color gold = Color(0xFFC4A35A);        // header + PanelCard strip
  static const Color goldText = Color(0xFFB08642);    // Field values
  static const Color navy = Color(0xFF0F2942);        // login button
  static const Color loginInk = Color(0xFF143D2B);    // text on the gold band
  static const Color avatarBlue = Color(0xFF7FD0E6);  // initials avatar
  static const Color green = Color(0xFF159A52);       // success / stat icons
  static const Color pageBg = Color(0xFFEEF2F6);
  static const Color slate800 = Color(0xFF1E293B);
  static const Color slate700 = Color(0xFF334155);
  static const Color slate600 = Color(0xFF475569);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate100 = Color(0xFFF1F5F9);
  static const Color hairline = Color(0x0D000000);    // border-black/5

  // ── Semantic tokens used across screens ────────────────────────────────────
  static const Color primary = accent;
  static const Color primaryContainer = accentDark;
  static const Color onPrimary = Colors.white;
  static const Color secondary = green;
  static const Color secondaryContainer = Color(0xFF0F7A40);
  static const Color tertiary = Color(0xFFD97706);    // amber
  static const Color error = Color(0xFFE11D48);       // rose-600

  static const Color background = pageBg;
  static const Color surface = Colors.white;
  static const Color surfaceContainerLowest = Colors.white;
  static const Color surfaceContainerLow = Color(0xFFF8FAFC);
  static const Color surfaceContainer = slate100;
  static const Color surfaceContainerHigh = slate200;

  static const Color onSurface = slate800;
  static const Color onSurfaceVariant = slate500;
  static const Color outline = slate400;
  static const Color outlineVariant = slate200;

  static const Color darkBackground = Color(0xFF0B1220);
}

class AppTheme {
  AppTheme._();

  /// Web `rounded-md` / `rounded-lg`.
  static const double radius = 6;
  static const double radiusLg = 8;

  static ThemeData get light => _build(Brightness.light);
  static ThemeData get dark => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final ink = isDark ? Colors.white : AppColors.onSurface;
    final inkMuted = isDark ? Colors.white70 : AppColors.onSurfaceVariant;
    final scheme = ColorScheme.fromSeed(seedColor: AppColors.accent, brightness: brightness).copyWith(
      primary: AppColors.accent,
      secondary: AppColors.green,
      tertiary: AppColors.tertiary,
      error: AppColors.error,
      surface: isDark ? const Color(0xFF111827) : Colors.white,
    );
    final inputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppTheme.radiusLg),
      borderSide: BorderSide(color: isDark ? Colors.white24 : AppColors.slate200),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: isDark ? AppColors.darkBackground : AppColors.pageBg,
      // No custom fontFamily — none is bundled, and a declared-but-missing
      // family can render blank glyphs. Platform default always renders.
      //
      // IMPORTANT: every style below has an EXPLICIT color. In Material 3 a
      // custom TextTheme that omits `color` resolves to a near-invisible colour
      // (the "empty card" bug in the sibling apps). Do not remove these colors.
      textTheme: TextTheme(
        headlineLarge: TextStyle(fontWeight: FontWeight.w800, fontSize: 26, height: 1.25, color: ink),
        titleLarge: TextStyle(fontWeight: FontWeight.w700, fontSize: 20, height: 1.3, color: ink),
        titleMedium: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: ink),
        bodyLarge: TextStyle(fontSize: 16, height: 1.5, color: ink),
        bodyMedium: TextStyle(fontSize: 14, height: 1.45, color: ink),
        labelMedium: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: inkMuted),
        labelSmall: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: inkMuted),
      ),
      // Inner pages render their own PageHeader; this AppBar style only covers
      // the few full-screen routes (login/scan) and dialogs that use one.
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.gold,
        foregroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800),
      ),
      // NOTE: newer Flutter uses CardThemeData (NOT CardTheme) — the latter is
      // a hard compile error.
      cardTheme: CardThemeData(
        color: isDark ? const Color(0xFF111827) : Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radius)),
        margin: EdgeInsets.zero,
      ),
      dividerTheme: DividerThemeData(color: isDark ? Colors.white12 : AppColors.hairline, thickness: 1, space: 1),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.accent,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.accent.withValues(alpha: 0.5),
          disabledForegroundColor: Colors.white,
          minimumSize: const Size.fromHeight(46),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radius)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: isDark ? Colors.white : AppColors.slate700,
          backgroundColor: isDark ? Colors.transparent : Colors.white,
          side: BorderSide(color: isDark ? Colors.white24 : AppColors.slate200),
          minimumSize: const Size.fromHeight(46),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radius)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.accent,
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLg)),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radius)),
        side: BorderSide.none,
      ),
      tabBarTheme: TabBarThemeData(
        labelColor: AppColors.accent,
        unselectedLabelColor: isDark ? Colors.white70 : AppColors.slate500,
        indicatorColor: AppColors.accent,
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: isDark ? Colors.white12 : AppColors.slate200,
        labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
        unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? const Color(0xFF1B2130) : Colors.white,
        isDense: true,
        border: inputBorder,
        enabledBorder: inputBorder,
        disabledBorder: inputBorder,
        focusedBorder: inputBorder.copyWith(borderSide: const BorderSide(color: AppColors.accent, width: 1.5)),
        labelStyle: TextStyle(color: inkMuted, fontWeight: FontWeight.w600, fontSize: 13),
        hintStyle: TextStyle(color: isDark ? Colors.white38 : AppColors.slate400, fontSize: 14),
        prefixIconColor: isDark ? Colors.white54 : AppColors.slate400,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLg)),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: isDark ? const Color(0xFF111827) : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        titleTextStyle: TextStyle(color: ink, fontSize: 17, fontWeight: FontWeight.w800),
      ),
      drawerTheme: const DrawerThemeData(
        backgroundColor: AppColors.accent,
        width: 264,
        shape: RoundedRectangleBorder(),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: AppColors.accent),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? Colors.white : null),
        trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AppColors.accent : null),
      ),
    );
  }
}
