import 'package:flutter/material.dart';

/// Same palette as the ShuleCloud web app (indigo brand, slate text, white cards).
class C {
  C._();
  static const brand = Color(0xFF5C67F2);
  static const brandDark = Color(0xFF3F48C9);
  static const ink = Color(0xFF0F172A);
  static const slate800 = Color(0xFF1E293B);
  static const slate700 = Color(0xFF334155);
  static const slate600 = Color(0xFF475569);
  static const slate500 = Color(0xFF64748B);
  static const slate400 = Color(0xFF94A3B8);
  static const slate200 = Color(0xFFE2E8F0);
  static const slate100 = Color(0xFFF1F5F9);
  static const bg = Color(0xFFF8FAFC);
  static const green = Color(0xFF16A34A);
  static const red = Color(0xFFE11D48);
  static const amber = Color(0xFFD97706);

  static Color hex(String h) {
    final s = h.replaceAll('#', '');
    return Color(int.parse(s.length == 6 ? 'FF$s' : s, radix: 16));
  }
}

ThemeData buildTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: C.brand, primary: C.brand, surface: Colors.white),
    scaffoldBackgroundColor: C.bg,
  );
  final border = OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: C.slate200));
  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white, foregroundColor: C.slate800, elevation: 0, scrolledUnderElevation: 0.5,
      titleTextStyle: TextStyle(color: C.slate800, fontSize: 17, fontWeight: FontWeight.w700),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true, fillColor: Colors.white, isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: border, enabledBorder: border,
      focusedBorder: border.copyWith(borderSide: const BorderSide(color: C.brand, width: 1.6)),
      hintStyle: const TextStyle(color: C.slate400),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: C.brand, minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: C.slate700, side: const BorderSide(color: C.slate200),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
    dividerTheme: const DividerThemeData(color: C.slate100, space: 1, thickness: 1),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white, indicatorColor: C.brand.withValues(alpha: 0.12), height: 64,
      labelTextStyle: WidgetStateProperty.resolveWith((s) => TextStyle(fontSize: 12, fontWeight: s.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500, color: s.contains(WidgetState.selected) ? C.brandDark : C.slate500)),
      iconTheme: WidgetStateProperty.resolveWith((s) => IconThemeData(color: s.contains(WidgetState.selected) ? C.brandDark : C.slate500)),
    ),
  );
}
