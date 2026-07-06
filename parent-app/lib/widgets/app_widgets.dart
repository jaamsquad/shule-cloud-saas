import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../core/theme/app_theme.dart';

/// A soft, left-accented card — the primary container per DESIGN.md.
class AppCard extends StatelessWidget {
  final Widget child;
  final Color? accent;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  const AppCard({super.key, required this.child, this.accent, this.padding = const EdgeInsets.all(16), this.onTap});

  @override
  Widget build(BuildContext context) {
    final card = Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(16),
        // No border AT ALL when there's no accent. A width-0 solid BorderSide is
        // a "hairline" border, and a non-uniform hairline + borderRadius fails
        // Flutter's paint assertion in debug builds — the decoration throws AFTER
        // painting the background but BEFORE painting the child, so every
        // accent-less card rendered as an empty white box with invisible content.
        border: accent == null ? null : Border(left: BorderSide(color: accent!, width: 4)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 2))],
      ),
      padding: padding,
      child: child,
    );
    if (onTap == null) return card;
    return InkWell(borderRadius: BorderRadius.circular(16), onTap: onTap, child: card);
  }
}

/// A labelled stat tile (used across dashboard/attendance/fees).
class StatTile extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData? icon;
  const StatTile({super.key, required this.label, required this.value, required this.color, this.icon});

  @override
  Widget build(BuildContext context) => AppCard(
        accent: color,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              if (icon != null) ...[Icon(icon, size: 16, color: color), const SizedBox(width: 6)],
              Text(label, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12, fontWeight: FontWeight.w600)),
            ]),
            const SizedBox(height: 6),
            Text(value, style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.w800)),
          ],
        ),
      );
}

/// A pill chip used for filters (Announcements / Messages / Homework tabs).
class FilterChipBar extends StatelessWidget {
  final List<String> items;
  final String selected;
  final ValueChanged<String> onSelect;
  const FilterChipBar({super.key, required this.items, required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) => SizedBox(
        height: 40,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, i) {
            final s = items[i] == selected;
            return ChoiceChip(
              label: Text(items[i]),
              selected: s,
              onSelected: (_) => onSelect(items[i]),
              selectedColor: AppColors.primary,
              labelStyle: TextStyle(color: s ? Colors.white : AppColors.onSurface, fontWeight: FontWeight.w600),
              backgroundColor: AppColors.surfaceContainer,
            );
          },
        ),
      );
}

/// Section header with an optional trailing action.
class SectionHeader extends StatelessWidget {
  final String title;
  final Widget? action;
  const SectionHeader(this.title, {super.key, this.action});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8, top: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.onSurface)),
            if (action != null) action!,
          ],
        ),
      );
}

/// Shimmer skeleton list for loading states.
class SkeletonList extends StatelessWidget {
  final int count;
  const SkeletonList({super.key, this.count = 5});
  @override
  Widget build(BuildContext context) => ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: count,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, __) => Shimmer.fromColors(
          baseColor: AppColors.surfaceContainer,
          highlightColor: AppColors.surfaceContainerLow,
          child: Container(height: 88, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16))),
        ),
      );
}

/// Friendly error / empty view.
class ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  final IconData icon;
  const ErrorView({super.key, required this.message, this.onRetry, this.icon = Icons.cloud_off});

  factory ErrorView.fromError(Object e, {VoidCallback? onRetry}) =>
      ErrorView(message: 'Could not load. Pull to refresh or try again.', onRetry: onRetry);

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 48, color: AppColors.outline),
              const SizedBox(height: 12),
              Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.onSurfaceVariant)),
              if (onRetry != null) ...[
                const SizedBox(height: 16),
                OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Retry')),
              ],
            ],
          ),
        ),
      );
}

/// A thin banner shown when offline.
class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        color: AppColors.tertiary.withValues(alpha: 0.12),
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
        child: const Row(children: [
          Icon(Icons.cloud_off, size: 16, color: AppColors.tertiary),
          SizedBox(width: 8),
          Expanded(child: Text('Offline — showing saved data. It will sync automatically.',
              style: TextStyle(color: AppColors.tertiary, fontSize: 12, fontWeight: FontWeight.w600))),
        ]),
      );
}

String ksh(num? n) => 'KES ${(n ?? 0).toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},')}';
