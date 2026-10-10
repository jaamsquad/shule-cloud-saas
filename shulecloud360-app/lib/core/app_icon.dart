import 'package:flutter/material.dart';

/// A phone-style app icon: a rounded tile in the app's colour with a soft
/// highlight, a white glyph and a coloured shadow.
class AppIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;
  final bool locked, dim;
  const AppIcon({super.key, required this.icon, required this.color, this.size = 56, this.locked = false, this.dim = false});

  @override
  Widget build(BuildContext context) {
    final hsl = HSLColor.fromColor(color);
    final light = hsl.withLightness((hsl.lightness + 0.12).clamp(0.0, 0.85)).toColor();
    final dark = hsl.withLightness((hsl.lightness - 0.1).clamp(0.08, 1.0)).toColor();
    final r = size * 0.28;
    return Stack(clipBehavior: Clip.none, children: [
      Opacity(
        opacity: dim ? 0.45 : 1,
        child: Container(
          width: size, height: size,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(r),
            gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [light, dark]),
            boxShadow: [BoxShadow(color: color.withValues(alpha: 0.32), blurRadius: size * 0.22, offset: Offset(0, size * 0.1))],
          ),
          child: Stack(children: [
            // glossy top highlight
            Positioned(
              left: 0, right: 0, top: 0, height: size * 0.5,
              child: DecoratedBox(decoration: BoxDecoration(
                borderRadius: BorderRadius.vertical(top: Radius.circular(r)),
                gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter,
                    colors: [Colors.white.withValues(alpha: 0.22), Colors.white.withValues(alpha: 0)]),
              )),
            ),
            Center(child: Icon(icon, color: Colors.white, size: size * 0.5)),
          ]),
        ),
      ),
      if (locked)
        Positioned(
          right: -4, top: -4,
          child: Container(
            width: size * 0.38, height: size * 0.38,
            decoration: BoxDecoration(color: const Color(0xFFF59E0B), shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
            child: Icon(Icons.lock_rounded, size: size * 0.2, color: Colors.white),
          ),
        ),
    ]);
  }
}

/// An icon for a page, picked from words in its name ("Generate Fees Invoice" → receipt).
IconData pageIcon(String label) {
  final l = label.toLowerCase();
  bool has(List<String> w) => w.any(l.contains);
  if (has(['dashboard', 'overview'])) return Icons.space_dashboard_rounded;
  if (has(['setting', 'config', 'setup'])) return Icons.tune_rounded;
  if (has(['delete', 'remove'])) return Icons.delete_outline_rounded;
  if (has(['audit', 'log', 'history'])) return Icons.history_rounded;
  if (has(['invoice', 'receipt', 'slip', 'statement', 'ledger'])) return Icons.receipt_long_rounded;
  if (has(['collect', 'payment', 'pay ', 'pay', 'm-pesa', 'mpesa'])) return Icons.payments_rounded;
  if (has(['defaulter', 'arrear', 'overdue', 'balance'])) return Icons.warning_amber_rounded;
  if (has(['scholarship', 'bursar', 'sponsor', 'aid'])) return Icons.volunteer_activism_rounded;
  if (has(['credit', 'overpay', 'refund', 'wallet'])) return Icons.account_balance_wallet_rounded;
  if (has(['expense', 'income', 'budget', 'account', 'ledger', 'journal', 'bank'])) return Icons.account_balance_rounded;
  if (has(['salary', 'payroll', 'payslip', 'allowance', 'deduction'])) return Icons.request_quote_rounded;
  if (has(['report card', 'result', 'transcript', 'certificate'])) return Icons.workspace_premium_rounded;
  if (has(['report', 'analysis', 'analytics', 'summary', 'statistic'])) return Icons.insights_rounded;
  if (has(['marks', 'grade', 'score', 'assessment', 'rubric', 'competenc'])) return Icons.grading_rounded;
  if (has(['exam', 'test', 'quiz', 'question'])) return Icons.quiz_rounded;
  if (has(['timetable', 'schedule', 'calendar', 'event', 'term'])) return Icons.event_note_rounded;
  if (has(['attendance', 'register', 'roll call', 'check-in', 'clock'])) return Icons.how_to_reg_rounded;
  if (has(['subject', 'lesson', 'syllabus', 'scheme', 'curriculum', 'strand', 'course'])) return Icons.menu_book_rounded;
  if (has(['class', 'stream', 'grade '])) return Icons.class_rounded;
  if (has(['admission', 'enrol', 'apply', 'application'])) return Icons.how_to_reg_outlined;
  if (has(['promot', 'transfer', 'graduat', 'alumni'])) return Icons.trending_up_rounded;
  if (has(['parent', 'guardian'])) return Icons.family_restroom_rounded;
  if (has(['student', 'learner', 'pupil'])) return Icons.school_rounded;
  if (has(['staff', 'employee', 'teacher', 'hr', 'leave', 'department', 'role', 'permission'])) return Icons.badge_rounded;
  if (has(['visitor', 'gate', 'sign-out', 'appointment', 'secretary'])) return Icons.door_front_door_rounded;
  if (has(['sms', 'message', 'email', 'notice', 'announcement', 'communication', 'template', 'meeting'])) return Icons.forum_rounded;
  if (has(['book', 'library', 'issue', 'borrow'])) return Icons.local_library_rounded;
  if (has(['bus', 'route', 'vehicle', 'driver', 'transport', 'trip'])) return Icons.directions_bus_rounded;
  if (has(['hostel', 'dorm', 'room', 'bed', 'boarding'])) return Icons.bed_rounded;
  if (has(['meal', 'canteen', 'cafeteria', 'food', 'menu'])) return Icons.restaurant_rounded;
  if (has(['stock', 'inventory', 'store', 'item', 'product', 'asset', 'procure', 'supplier', 'purchase'])) return Icons.inventory_2_rounded;
  if (has(['sale', 'pos', 'shop', 'cart'])) return Icons.point_of_sale_rounded;
  if (has(['sport', 'club', 'activit', 'game', 'team'])) return Icons.emoji_events_rounded;
  if (has(['live', 'video', 'zoom', 'online'])) return Icons.videocam_rounded;
  if (has(['document', 'file', 'upload', 'download', 'import', 'export'])) return Icons.folder_rounded;
  if (has(['id card', 'card', 'print'])) return Icons.badge_outlined;
  if (has(['add', 'new', 'create', 'generate', 'register'])) return Icons.add_circle_outline_rounded;
  if (has(['list', 'all ', 'view', 'manage'])) return Icons.view_list_rounded;
  return Icons.article_rounded;
}
