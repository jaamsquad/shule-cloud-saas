import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// ShuleCloud 360 palette: school blue headers and actions, slate text, white cards.
class C {
  C._();
  static const brand = Color(0xFF2F7BF5);
  static const brandDark = Color(0xFF1D5FD0);
  static const sky = Color(0xFF5AB0FF);      // header gradient, light end
  static const blue = Color(0xFF2563EB);     // header gradient, deep end
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

  // Icons and cards are grey & white — only the headers carry the school blue.
  static const iconInk = Color(0xFF334155);    // glyph on a light tile
  static const iconTile = Color(0xFF1F2937);   // dark neutral tile, white glyph
  static const iconSoft = Color(0xFFF1F5F9);   // light grey tile / blob

  static Color hex(String h) {
    final s = h.replaceAll('#', '');
    return Color(int.parse(s.length == 6 ? 'FF$s' : s, radix: 16));
  }
}

ThemeData buildTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: C.brand, primary: C.brand, surface: Colors.white),
    scaffoldBackgroundColor: const Color(0xFFF3F6FB),
  );
  final border = OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: C.slate200));
  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: C.blue, foregroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 0,
      systemOverlayStyle: SystemUiOverlayStyle(statusBarColor: Colors.transparent, statusBarIconBrightness: Brightness.light, statusBarBrightness: Brightness.dark),
      titleTextStyle: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(bottom: Radius.circular(20))),
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
