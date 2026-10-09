import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../core/theme/app_theme.dart';

// Building blocks that mirror the web Teacher Portal (PortalShell.tsx):
// PageTitle → PageHeader, PanelCard → PanelCard, Field → InfoField, and the
// dashboard stat card → StatTile.

/// A standard inner page: title row (with back button when the page was
/// pushed) above the body. The gold header + sidebar come from AppShell, so
/// screens never build their own AppBar.
class PortalPage extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final Widget body;
  final Widget? floatingActionButton;
  final Widget? bottomBar;
  final PreferredSizeWidget? tabs;

  const PortalPage({
    super.key,
    required this.title,
    required this.body,
    this.subtitle,
    this.actions = const [],
    this.floatingActionButton,
    this.bottomBar,
    this.tabs,
  });

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: Colors.transparent,
        floatingActionButton: floatingActionButton,
        bottomNavigationBar: bottomBar == null ? null : BottomActionBar(child: bottomBar!),
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            PageHeader(title: title, subtitle: subtitle, actions: actions),
            if (tabs != null)
              Container(
                margin: const EdgeInsets.fromLTRB(16, 0, 16, 4),
                decoration: _panelDecoration(context),
                child: tabs,
              ),
            Expanded(child: body),
          ],
        ),
      );
}

/// Web `PageTitle`: "text-xl font-bold text-slate-700" with optional actions.
class PageHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget> actions;
  const PageHeader({super.key, required this.title, this.subtitle, this.actions = const []});

  @override
  Widget build(BuildContext context) {
    final canPop = Navigator.of(context).canPop();
    return Padding(
      padding: EdgeInsets.fromLTRB(canPop ? 4 : 16, 14, 8, 10),
      child: Row(children: [
        if (canPop)
          IconButton(
            tooltip: 'Back',
            visualDensity: VisualDensity.compact,
            onPressed: () => Navigator.of(context).maybePop(),
            icon: const Icon(Icons.arrow_back, color: AppColors.slate700, size: 20),
          ),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: _ink(context, AppColors.slate700))),
            if (subtitle != null && subtitle!.isNotEmpty)
              Text(subtitle!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, color: AppColors.slate500)),
          ]),
        ),
        ...actions,
      ]),
    );
  }
}

/// White card with the gold title strip used across the web portal.
class PanelCard extends StatelessWidget {
  final String title;
  final Widget child;
  final Widget? action;
  final IconData? icon;
  final EdgeInsetsGeometry padding;
  const PanelCard({
    super.key,
    required this.title,
    required this.child,
    this.action,
    this.icon,
    this.padding = const EdgeInsets.all(16),
  });

  @override
  Widget build(BuildContext context) => Container(
        decoration: _panelDecoration(context),
        clipBehavior: Clip.antiAlias,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(
            color: AppColors.gold,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
            child: Row(children: [
              if (icon != null) ...[Icon(icon, size: 16, color: Colors.white), const SizedBox(width: 8)],
              Expanded(child: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14))),
              if (action != null) action!,
            ]),
          ),
          Padding(padding: padding, child: child),
        ]),
      );
}

/// Small translucent button that sits on the gold PanelCard strip
/// ("bg-white/20 hover:bg-white/30 text-white").
class StripButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onTap;
  const StripButton({super.key, required this.label, this.icon, this.onTap});

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              if (icon != null) ...[Icon(icon, size: 14, color: Colors.white), const SizedBox(width: 4)],
              Text(label, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
            ]),
          ),
        ),
      );
}

/// Web `Field`: bold slate label + gold value, stacked on narrow widths.
class InfoField extends StatelessWidget {
  final String label;
  final String? value;
  const InfoField({super.key, required this.label, this.value});

  @override
  Widget build(BuildContext context) {
    final v = (value == null || value!.trim().isEmpty) ? '—' : value!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 9),
      child: LayoutBuilder(builder: (context, c) {
        final labelText = Text(label, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.slate600));
        final valueText = Text(v, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: AppColors.goldText));
        if (c.maxWidth < 260) {
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [labelText, const SizedBox(height: 2), valueText]);
        }
        return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: c.maxWidth < 400 ? 108 : 130, child: labelText),
          Expanded(child: valueText),
        ]);
      }),
    );
  }
}

/// A plain white web card ("bg-white rounded-md shadow-sm border-black/5").
/// [accent] adds a coloured left stripe.
class AppCard extends StatelessWidget {
  final Widget child;
  final Color? accent;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  const AppCard({super.key, required this.child, this.accent, this.padding = const EdgeInsets.all(14), this.onTap});

  @override
  Widget build(BuildContext context) {
    // The stripe is a positioned child rather than a one-sided Border: a
    // non-uniform Border + borderRadius fails Flutter's paint assertion in
    // debug builds (what CI ships), leaving an empty card.
    Widget content = Padding(padding: padding, child: child);
    if (accent != null) {
      content = Stack(children: [
        Padding(padding: const EdgeInsets.only(left: 4), child: content),
        Positioned(left: 0, top: 0, bottom: 0, width: 4, child: ColoredBox(color: accent!)),
      ]);
    }
    return Material(
      color: Colors.transparent,
      child: Ink(
        decoration: _panelDecoration(context),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppTheme.radius),
          onTap: onTap,
          child: ClipRRect(borderRadius: BorderRadius.circular(AppTheme.radius), child: content),
        ),
      ),
    );
  }
}

/// Web dashboard stat card: tinted icon square + big value + uppercase label.
class StatTile extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData? icon;
  final String? delta;
  final VoidCallback? onTap;
  const StatTile({super.key, required this.label, required this.value, required this.color, this.icon, this.delta, this.onTap});

  @override
  Widget build(BuildContext context) => AppCard(
        onTap: onTap,
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppTheme.radiusLg)),
            child: Icon(icon ?? Icons.insights_outlined, size: 20, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: _ink(context, AppColors.slate800))),
              Text(label.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 10.5, letterSpacing: 0.4, fontWeight: FontWeight.w700, color: AppColors.slate500)),
              if (delta != null)
                Text(delta!, style: const TextStyle(color: AppColors.green, fontSize: 11, fontWeight: FontWeight.w700)),
            ]),
          ),
        ]),
      );
}

/// Segmented filter tabs (days, subjects…), styled like the web pill toggles.
class FilterChipBar extends StatelessWidget {
  final List<String> items;
  final String selected;
  final ValueChanged<String> onSelect;
  const FilterChipBar({super.key, required this.items, required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) => SizedBox(
        height: 36,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(width: 6),
          itemBuilder: (_, i) {
            final s = items[i] == selected;
            return Material(
              color: s ? AppColors.teal : Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.radius),
                side: BorderSide(color: s ? AppColors.teal : AppColors.slate200),
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(AppTheme.radius),
                onTap: () => onSelect(items[i]),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: Center(
                    child: Text(items[i],
                        style: TextStyle(color: s ? Colors.white : AppColors.slate600, fontWeight: FontWeight.w700, fontSize: 13)),
                  ),
                ),
              ),
            );
          },
        ),
      );
}

/// Uppercase section label ("text-[10px] font-black uppercase tracking-widest").
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
            Text(title.toUpperCase(),
                style: const TextStyle(fontSize: 11.5, letterSpacing: 1.1, fontWeight: FontWeight.w900, color: AppColors.slate500)),
            if (action != null) action!,
          ],
        ),
      );
}

/// Label above a form control (web "block text-xs font-bold text-slate-600").
class FieldLabel extends StatelessWidget {
  final String text;
  const FieldLabel(this.text, {super.key});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.slate600)),
      );
}

/// Sticky action bar at the bottom of a page (Save / Submit…).
class BottomActionBar extends StatelessWidget {
  final Widget child;
  const BottomActionBar({super.key, required this.child});
  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color,
          border: const Border(top: BorderSide(color: AppColors.slate200)),
        ),
        child: SafeArea(top: false, child: Padding(padding: const EdgeInsets.fromLTRB(16, 10, 16, 10), child: child)),
      );
}

/// Inline notice ("bg-*-50 border border-*-200 text-*-700 rounded-md").
class InfoBanner extends StatelessWidget {
  final String text;
  final Color color;
  final IconData icon;
  const InfoBanner({super.key, required this.text, this.color = AppColors.teal, this.icon = Icons.info_outline});
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          border: Border.all(color: color.withValues(alpha: 0.3)),
          borderRadius: BorderRadius.circular(AppTheme.radius),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: TextStyle(color: color, fontSize: 12.5, fontWeight: FontWeight.w600))),
        ]),
      );
}

/// Round initials avatar (web: "bg-[#7fd0e6] text-[#0f5132] font-black").
class InitialsAvatar extends StatelessWidget {
  final String name;
  final String? photoUrl;
  final double radius;
  const InitialsAvatar({super.key, required this.name, this.photoUrl, this.radius = 18});
  @override
  Widget build(BuildContext context) => CircleAvatar(
        radius: radius,
        backgroundColor: AppColors.avatarBlue,
        backgroundImage: photoUrl != null && photoUrl!.isNotEmpty ? NetworkImage(photoUrl!) : null,
        child: photoUrl != null && photoUrl!.isNotEmpty
            ? null
            : Text(initials(name), style: TextStyle(fontSize: radius * 0.7, fontWeight: FontWeight.w900, color: const Color(0xFF0F5132))),
      );
}

/// Shimmer skeleton list for loading states.
class SkeletonList extends StatelessWidget {
  final int count;
  const SkeletonList({super.key, this.count = 5});
  @override
  Widget build(BuildContext context) => ListView.separated(
        padding: const EdgeInsets.all(16),
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: count,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, __) => Shimmer.fromColors(
          baseColor: AppColors.slate200,
          highlightColor: AppColors.slate100,
          child: Container(height: 72, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(AppTheme.radius))),
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
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(color: AppColors.slate200.withValues(alpha: 0.6), shape: BoxShape.circle),
                child: Icon(icon, size: 30, color: AppColors.slate400),
              ),
              const SizedBox(height: 12),
              Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.slate500, fontWeight: FontWeight.w600)),
              if (onRetry != null) ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: 140,
                  child: OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh, size: 18), label: const Text('Retry')),
                ),
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
        color: const Color(0xFFFFFBEB),
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
        child: const Row(children: [
          Icon(Icons.cloud_off, size: 16, color: AppColors.tertiary),
          SizedBox(width: 8),
          Expanded(
              child: Text('Offline — showing saved data. It will sync automatically.',
                  style: TextStyle(color: AppColors.tertiary, fontSize: 12, fontWeight: FontWeight.w700))),
        ]),
      );
}

/// Status pill for approval workflows (Draft/Submitted/Approved/Locked/etc).
class StatusPill extends StatelessWidget {
  final String label;
  final Color color;
  const StatusPill({super.key, required this.label, required this.color});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          border: Border.all(color: color.withValues(alpha: 0.25)),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(label.toUpperCase(), style: TextStyle(color: color, fontSize: 10, letterSpacing: 0.4, fontWeight: FontWeight.w900)),
      );
}

String initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  if (parts.length == 1) return parts[0].substring(0, 1).toUpperCase();
  return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
}

void showToast(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(message, style: const TextStyle(fontWeight: FontWeight.w600)),
    backgroundColor: error ? AppColors.error : AppColors.slate800,
  ));
}

BoxDecoration _panelDecoration(BuildContext context) => BoxDecoration(
      color: Theme.of(context).cardTheme.color,
      borderRadius: BorderRadius.circular(AppTheme.radius),
      border: Border.all(color: AppColors.hairline),
      boxShadow: const [BoxShadow(color: Color(0x0F0F172A), blurRadius: 3, offset: Offset(0, 1))],
    );

Color _ink(BuildContext context, Color light) => Theme.of(context).brightness == Brightness.dark ? Colors.white : light;
