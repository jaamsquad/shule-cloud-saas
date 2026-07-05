import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';

/// Small labelled chip (GPS Active, Online, battery %, boarding status, etc.).
class StatusChip extends StatelessWidget {
  final IconData? icon;
  final String label;
  final Color color;
  const StatusChip({super.key, this.icon, required this.label, this.color = AppColors.primary});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 14, color: color), const SizedBox(width: 5)],
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12)),
        ],
      ),
    );
  }
}
