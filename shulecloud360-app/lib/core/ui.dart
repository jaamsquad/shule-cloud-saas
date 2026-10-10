import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'theme.dart';

/// The blue curved header every main screen starts with: menu or back on the left,
/// the title, a bell on the right, and optionally tabs or a profile row underneath.
class CurvedHeader extends StatelessWidget {
  final String title;
  final bool back;
  final VoidCallback? onLeading;
  final VoidCallback? onBell;
  final int unread;
  final Widget? below;            // tabs, a profile row, a search field…
  final List<Color>? colors;
  final double extraBottom;       // room for a card that overlaps the curve
  const CurvedHeader({super.key, required this.title, this.back = false, this.onLeading, this.onBell, this.unread = 0, this.below, this.colors, this.extraBottom = 0});

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    final g = colors ?? const [C.sky, C.blue];
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(statusBarColor: Colors.transparent),
      child: Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: g),
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(28)),
        boxShadow: [BoxShadow(color: g.last.withValues(alpha: 0.25), blurRadius: 16, offset: const Offset(0, 6))],
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(28)),
        child: Stack(children: [
          const Positioned.fill(child: CustomPaint(painter: _Dots())),
          Positioned(right: -50, top: -60, child: _ring(180)),
          Positioned(left: -40, bottom: -70, child: _ring(140)),
          Padding(
            padding: EdgeInsets.fromLTRB(6, top + 4, 6, 12 + extraBottom),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(children: [
                _round(back ? Icons.arrow_back_rounded : Icons.menu_rounded, onLeading ?? () => back ? Navigator.maybePop(context) : Scaffold.maybeOf(context)?.openDrawer()),
                Expanded(child: Text(title, textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: 0.2))),
                Stack(clipBehavior: Clip.none, children: [
                  _round(Icons.notifications_none_rounded, onBell),
                  if (unread > 0)
                    Positioned(
                      right: 8, top: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1), constraints: const BoxConstraints(minWidth: 16),
                        decoration: BoxDecoration(color: const Color(0xFFFF5A5F), borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.white, width: 1.5)),
                        child: Text(unread > 9 ? '9+' : '$unread', textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800)),
                      ),
                    ),
                ]),
              ]),
              if (below != null) Padding(padding: const EdgeInsets.fromLTRB(10, 8, 10, 0), child: below!),
            ]),
          ),
        ]),
      ),
    ),
    );
  }

  Widget _round(IconData i, VoidCallback? onTap) => Padding(
        padding: const EdgeInsets.all(4),
        child: Material(
          color: Colors.white.withValues(alpha: 0.18), shape: const CircleBorder(),
          child: InkWell(customBorder: const CircleBorder(), onTap: onTap, child: SizedBox(width: 40, height: 40, child: Icon(i, color: Colors.white, size: 22))),
        ),
      );

  Widget _ring(double d) => Container(width: d, height: d, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white.withValues(alpha: 0.1), width: 22)));
}

class _Dots extends CustomPainter {
  const _Dots();
  @override
  void paint(Canvas canvas, Size s) {
    final p = Paint()..color = Colors.white.withValues(alpha: 0.12);
    for (double y = 14; y < s.height; y += 18) {
      for (double x = 14; x < s.width * 0.35; x += 18) {
        canvas.drawCircle(Offset(x, y), 1.4, p);
      }
    }
  }

  @override
  bool shouldRepaint(_Dots o) => false;
}

/// White underline tabs that sit inside the curved header (DASHBOARD | TIMELINE style).
class HeaderTabs extends StatelessWidget {
  final List<String> labels;
  final TabController? controller;
  const HeaderTabs({super.key, required this.labels, this.controller});
  @override
  Widget build(BuildContext context) => TabBar(
        controller: controller,
        isScrollable: labels.length > 2, tabAlignment: labels.length > 2 ? TabAlignment.start : TabAlignment.fill,
        indicatorColor: Colors.white, indicatorWeight: 3, indicatorSize: TabBarIndicatorSize.label, dividerColor: Colors.transparent,
        labelColor: Colors.white, unselectedLabelColor: Colors.white.withValues(alpha: 0.7),
        labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, letterSpacing: 0.6),
        unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, letterSpacing: 0.6),
        tabs: [for (final l in labels) Tab(text: l.toUpperCase(), height: 38)],
      );
}

/// A line icon with a colour blob behind it — the illustrated look of the reference tiles.
class DuoIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;
  const DuoIcon({super.key, required this.icon, required this.color, this.size = 44});
  @override
  Widget build(BuildContext context) {
    final hsl = HSLColor.fromColor(color);
    final accent = hsl.withHue((hsl.hue + 40) % 360).withLightness(0.62).toColor();
    return SizedBox(
      width: size * 1.25, height: size * 1.15,
      child: Stack(alignment: Alignment.center, children: [
        Positioned(right: 0, bottom: 0, child: Container(width: size * 0.78, height: size * 0.78, decoration: BoxDecoration(color: color.withValues(alpha: 0.16), shape: BoxShape.circle))),
        Positioned(left: size * 0.05, top: size * 0.02, child: Container(width: size * 0.32, height: size * 0.32, decoration: BoxDecoration(color: accent.withValues(alpha: 0.35), shape: BoxShape.circle))),
        Icon(icon, size: size, color: HSLColor.fromColor(color).withLightness((hsl.lightness - 0.08).clamp(0.2, 0.6)).toColor()),
      ]),
    );
  }
}

/// White rounded dashboard tile: big illustrated icon, label underneath, optional red badge.
class FeatureTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final String? badge;            // e.g. "NEW", a count, or "" for a plain dot
  final bool locked, starred;
  const FeatureTile({super.key, required this.icon, required this.color, required this.label, required this.onTap, this.onLongPress, this.badge, this.locked = false, this.starred = false});

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        elevation: 0,
        shadowColor: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap, onLongPress: onLongPress,
          child: Ink(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFEEF2F7)),
              boxShadow: [BoxShadow(color: const Color(0xFF1E3A8A).withValues(alpha: 0.07), blurRadius: 14, offset: const Offset(0, 6))],
            ),
            child: Stack(children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 14, 6, 10),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Opacity(opacity: locked ? 0.45 : 1, child: DuoIcon(icon: icon, color: color, size: 40)),
                  const SizedBox(height: 8),
                  Text(label, maxLines: 2, textAlign: TextAlign.center, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12.5, height: 1.2, fontWeight: FontWeight.w700, color: C.slate700)),
                ]),
              ),
              if (badge != null && !locked)
                Positioned(
                  right: 8, top: 8,
                  child: badge!.isEmpty
                      ? Container(width: 10, height: 10, decoration: const BoxDecoration(color: Color(0xFFFF5A5F), shape: BoxShape.circle))
                      : Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(color: const Color(0xFFFF5A5F), borderRadius: BorderRadius.circular(8)),
                          child: Text(badge!, style: const TextStyle(color: Colors.white, fontSize: 8.5, fontWeight: FontWeight.w800, letterSpacing: 0.4)),
                        ),
                ),
              if (locked) const Positioned(right: 8, top: 8, child: Icon(Icons.lock_rounded, size: 15, color: C.amber)),
              if (starred && !locked) const Positioned(left: 8, top: 8, child: Icon(Icons.star_rounded, size: 16, color: Color(0xFFF59E0B))),
            ]),
          ),
        ),
      );
}

/// Tiles three to a row (more on wide screens), square-ish like the reference dashboard.
class TileGrid extends StatelessWidget {
  final List<Widget> children;
  const TileGrid({super.key, required this.children});
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (_, box) {
        final cols = math.max(3, (box.maxWidth / 125).floor());
        return GridView.count(
          crossAxisCount: cols, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), padding: EdgeInsets.zero,
          mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.92,
          children: children,
        );
      });
}

/// Section heading with an optional link on the right ("View all").
class Heading extends StatelessWidget {
  final String text;
  final String? action;
  final VoidCallback? onAction;
  const Heading(this.text, {super.key, this.action, this.onAction});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(2, 18, 2, 10),
        child: Row(children: [
          Expanded(child: Text(text, style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: C.ink))),
          if (action != null) GestureDetector(onTap: onAction, child: Text(action!, style: const TextStyle(color: C.blue, fontWeight: FontWeight.w700, fontSize: 13))),
        ]),
      );
}

/// A ring with a number in the middle (the "67" results gauge).
class ProgressRing extends StatelessWidget {
  final double value; // 0..1
  final String center;
  final String? caption;
  final Color color;
  final double size;
  const ProgressRing({super.key, required this.value, required this.center, this.caption, this.color = C.blue, this.size = 92});
  @override
  Widget build(BuildContext context) => SizedBox(
        width: size, height: size,
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: value.clamp(0, 1)), duration: const Duration(milliseconds: 900), curve: Curves.easeOutCubic,
          builder: (_, v, __) => CustomPaint(
            painter: _Ring(v, color),
            child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(center, style: TextStyle(fontSize: size * 0.26, fontWeight: FontWeight.w900, color: C.ink)),
              if (caption != null) Text(caption!, style: const TextStyle(fontSize: 10, color: C.slate500, fontWeight: FontWeight.w600)),
            ])),
          ),
        ),
      );
}

class _Ring extends CustomPainter {
  final double v;
  final Color color;
  _Ring(this.v, this.color);
  @override
  void paint(Canvas c, Size s) {
    final r = Rect.fromLTWH(6, 6, s.width - 12, s.height - 12);
    final base = Paint()..style = PaintingStyle.stroke..strokeWidth = 9..strokeCap = StrokeCap.round..color = color.withValues(alpha: 0.12);
    final fg = Paint()..style = PaintingStyle.stroke..strokeWidth = 9..strokeCap = StrokeCap.round
      ..shader = SweepGradient(colors: [const Color(0xFFFF8A4C), color], startAngle: 0, endAngle: math.pi * 2).createShader(r);
    c.drawArc(r, math.pi * 0.75, math.pi * 1.5, false, base);
    c.drawArc(r, math.pi * 0.75, math.pi * 1.5 * v, false, fg);
  }

  @override
  bool shouldRepaint(_Ring o) => o.v != v;
}

/// Round avatar with initials (or a photo URL).
class Avatar extends StatelessWidget {
  final String name;
  final String? photo;
  final double size;
  final Color color;
  const Avatar({super.key, required this.name, this.photo, this.size = 48, this.color = C.blue});
  @override
  Widget build(BuildContext context) {
    final p = name.trim().split(RegExp(r'\s+')).where((x) => x.isNotEmpty).toList();
    final ini = p.isEmpty ? '?' : (p.first[0] + (p.length > 1 ? p.last[0] : '')).toUpperCase();
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2.5),
        gradient: LinearGradient(colors: [color.withValues(alpha: 0.75), color]),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 8, offset: const Offset(0, 3))],
      ),
      clipBehavior: Clip.antiAlias,
      child: photo != null && photo!.startsWith('http')
          ? Image.network(photo!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Center(child: Text(ini, style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: size * 0.36))))
          : Center(child: Text(ini, style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: size * 0.36))),
    );
  }
}
