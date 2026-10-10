import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/theme.dart';

/// Fades and lifts its child into place after [delay] — used to stagger a screen's pieces.
class Rise extends StatefulWidget {
  final Widget child;
  final Duration delay;
  final double from;
  const Rise({super.key, required this.child, this.delay = Duration.zero, this.from = 24});
  @override
  State<Rise> createState() => _RiseState();
}

class _RiseState extends State<Rise> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 650));
  late final Animation<double> _t = CurvedAnimation(parent: _c, curve: Curves.easeOutCubic);
  Timer? _wait;

  @override
  void initState() {
    super.initState();
    if (widget.delay == Duration.zero) { _c.forward(); } else { _wait = Timer(widget.delay, () { if (mounted) _c.forward(); }); }
  }

  @override
  void dispose() { _wait?.cancel(); _c.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: _t,
        builder: (_, child) => Opacity(opacity: _t.value, child: Transform.translate(offset: Offset(0, (1 - _t.value) * widget.from), child: child)),
        child: widget.child,
      );
}

/// Shakes its child sideways whenever [trigger] changes (wrong ID, wrong password…).
class Shake extends StatefulWidget {
  final Widget child;
  final int trigger;
  const Shake({super.key, required this.child, required this.trigger});
  @override
  State<Shake> createState() => _ShakeState();
}

class _ShakeState extends State<Shake> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 480));

  @override
  void didUpdateWidget(Shake old) {
    super.didUpdateWidget(old);
    if (old.trigger != widget.trigger) _c.forward(from: 0);
  }

  @override
  void dispose() { _c.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: _c,
        builder: (_, child) => Transform.translate(offset: Offset(math.sin(_c.value * math.pi * 6) * 10 * (1 - _c.value), 0), child: child),
        child: widget.child,
      );
}

/// Slowly drifting soft colour blobs behind a screen.
class Aurora extends StatefulWidget {
  final bool vivid;
  const Aurora({super.key, this.vivid = false});
  @override
  State<Aurora> createState() => _AuroraState();
}

class _AuroraState extends State<Aurora> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(seconds: 14))..repeat();

  @override
  void dispose() { _c.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => IgnorePointer(
        child: AnimatedBuilder(
          animation: _c,
          builder: (_, __) => CustomPaint(painter: _AuroraPainter(_c.value * 2 * math.pi, widget.vivid), size: Size.infinite),
        ),
      );
}

class _AuroraPainter extends CustomPainter {
  final double t;
  final bool vivid;
  _AuroraPainter(this.t, this.vivid);

  @override
  void paint(Canvas canvas, Size s) {
    final a = vivid ? 0.55 : 0.16;
    void blob(Color c, double x, double y, double r) {
      final center = Offset(s.width * x, s.height * y);
      canvas.drawCircle(center, r, Paint()..shader = RadialGradient(colors: [c.withValues(alpha: a), c.withValues(alpha: 0)]).createShader(Rect.fromCircle(center: center, radius: r)));
    }
    final w = s.width;
    blob(const Color(0xFF8B93FF), 0.15 + 0.08 * math.sin(t), 0.12 + 0.05 * math.cos(t), w * 0.75);
    blob(const Color(0xFF22D3EE), 0.9 + 0.07 * math.cos(t * 1.3), 0.08 + 0.06 * math.sin(t), w * 0.6);
    blob(const Color(0xFFF472B6), 0.75 + 0.1 * math.sin(t * 0.7), 0.45 + 0.05 * math.cos(t * 1.1), w * 0.55);
    blob(C.brand, 0.2 + 0.06 * math.cos(t * 0.9), 0.55 + 0.06 * math.sin(t * 1.2), w * 0.5);
  }

  @override
  bool shouldRepaint(_AuroraPainter o) => o.t != t;
}

/// Big brand button with a soft glow, a press-down bounce and a busy spinner.
class BrandButton extends StatefulWidget {
  final String label;
  final VoidCallback? onTap;
  final bool busy;
  final IconData icon;
  const BrandButton({super.key, required this.label, required this.onTap, this.busy = false, this.icon = Icons.arrow_forward_rounded});
  @override
  State<BrandButton> createState() => _BrandButtonState();
}

class _BrandButtonState extends State<BrandButton> {
  bool _down = false;
  @override
  Widget build(BuildContext context) {
    final on = widget.onTap != null && !widget.busy;
    return Semantics(
      button: true, label: widget.label,
      child: GestureDetector(
        onTapDown: on ? (_) => setState(() => _down = true) : null,
        onTapCancel: on ? () => setState(() => _down = false) : null,
        onTapUp: on ? (_) { setState(() => _down = false); widget.onTap!(); } : null,
        child: AnimatedScale(
          scale: _down ? 0.97 : 1, duration: const Duration(milliseconds: 120),
          child: AnimatedOpacity(
            opacity: widget.onTap == null ? 0.5 : 1, duration: const Duration(milliseconds: 200),
            child: Container(
              height: 54, width: double.infinity,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [C.brand, C.blue]),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: C.brand.withValues(alpha: 0.4), blurRadius: 18, offset: const Offset(0, 8))],
              ),
              alignment: Alignment.center,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: widget.busy
                    ? const SizedBox(key: ValueKey('busy'), width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.6, color: Colors.white))
                    : Row(key: ValueKey(widget.label), mainAxisSize: MainAxisSize.min, children: [
                        Text(widget.label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
                        const SizedBox(width: 8),
                        Icon(widget.icon, color: Colors.white, size: 20),
                      ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
