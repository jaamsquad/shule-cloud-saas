import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import 'motion.dart';

/// First screen for anyone not signed in: what ShuleCloud 360 is, then "Get started".
class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});
  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _Slide {
  final IconData icon;
  final Color color;
  final String title, body;
  const _Slide(this.icon, this.color, this.title, this.body);
}

const _slides = [
  _Slide(Icons.groups_rounded, Color(0xFF5C67F2), 'One app for everyone',
      'Admins, bursars, teachers, learners and parents all sign in here with the details the school gave them.'),
  _Slide(Icons.apps_rounded, Color(0xFF0EA5E9), 'Only your apps',
      'Fees, exams, classes, transport, the student portal — you see just what your role allows.'),
  _Slide(Icons.bolt_rounded, Color(0xFFF59E0B), 'Your school in your pocket',
      'Pay and track fees, check results, mark registers and get school news wherever you are.'),
];

class _WelcomeScreenState extends State<WelcomeScreen> {
  final _pages = PageController();
  int _page = 0;
  Timer? _auto;

  @override
  void initState() {
    super.initState();
    _auto = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!_pages.hasClients) return;
      _pages.animateToPage((_page + 1) % _slides.length, duration: const Duration(milliseconds: 600), curve: Curves.easeInOutCubic);
    });
  }

  @override
  void dispose() { _auto?.cancel(); _pages.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final h = MediaQuery.sizeOf(context).height;
    return Scaffold(
      backgroundColor: const Color(0xFF0B2A6B),
      body: Stack(children: [
        const Positioned.fill(child: DecoratedBox(decoration: BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF0B2A6B), Color(0xFF1D4ED8), C.sky]),
        ))),
        const Positioned.fill(child: Aurora(vivid: true)),
        SafeArea(
          bottom: false,
          child: Column(children: [
            const SizedBox(height: 8),
            Rise(child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFF4ADE80), shape: BoxShape.circle)),
              const SizedBox(width: 8),
              const Text('SHULECLOUD 360', style: TextStyle(color: Colors.white70, fontSize: 12, letterSpacing: 3, fontWeight: FontWeight.w700)),
            ])),
            Expanded(child: Center(child: _Orbit(size: math.min(h * 0.36, 320)))),
            const Rise(delay: Duration(milliseconds: 250), child: Text('Your whole school,\none app.', textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontSize: 30, height: 1.15, fontWeight: FontWeight.w800, letterSpacing: -0.5))),
            const SizedBox(height: 22),
            Rise(
              delay: const Duration(milliseconds: 450), from: 80,
              child: Container(
                width: double.infinity,
                padding: EdgeInsets.fromLTRB(24, 22, 24, 18 + MediaQuery.paddingOf(context).bottom),
                decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 440),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      SizedBox(
                        height: 116,
                        child: PageView.builder(
                          controller: _pages, itemCount: _slides.length,
                          onPageChanged: (i) => setState(() => _page = i),
                          itemBuilder: (_, i) => _SlideView(_slides[i]),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        for (var i = 0; i < _slides.length; i++)
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 350), curve: Curves.easeOut,
                            margin: const EdgeInsets.symmetric(horizontal: 3), height: 7, width: i == _page ? 24 : 7,
                            decoration: BoxDecoration(color: i == _page ? _slides[i].color : C.slate200, borderRadius: BorderRadius.circular(4)),
                          ),
                      ]),
                      const SizedBox(height: 20),
                      BrandButton(label: 'Get started', onTap: () => context.go('/login')),
                      const SizedBox(height: 12),
                      const Text.rich(
                        TextSpan(style: TextStyle(fontSize: 12.5, color: C.slate500), children: [
                          TextSpan(text: 'Need help? Call '),
                          TextSpan(text: AppConfig.supportPhone, style: TextStyle(fontWeight: FontWeight.w700, color: C.slate700)),
                        ]),
                        textAlign: TextAlign.center,
                      ),
                    ]),
                  ),
                ),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}

class _SlideView extends StatelessWidget {
  final _Slide s;
  const _SlideView(this.s);
  @override
  Widget build(BuildContext context) => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 48, height: 48,
          decoration: BoxDecoration(color: s.color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)),
          child: Icon(s.icon, color: s.color, size: 26),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(s.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: C.ink)),
            const SizedBox(height: 6),
            Text(s.body, style: const TextStyle(fontSize: 14, height: 1.4, color: C.slate500)),
          ]),
        ),
      ]);
}

/// The ShuleCloud cap in the middle with the school's apps circling it.
class _Orbit extends StatefulWidget {
  final double size;
  const _Orbit({required this.size});
  @override
  State<_Orbit> createState() => _OrbitState();
}

class _OrbitState extends State<_Orbit> with TickerProviderStateMixin {
  late final AnimationController _spin = AnimationController(vsync: this, duration: const Duration(seconds: 30))..repeat();
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))..repeat();
  late final AnimationController _in = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..forward();

  static const _apps = [
    (Icons.payments_rounded, Color(0xFF10B981)),
    (Icons.menu_book_rounded, Color(0xFF6366F1)),
    (Icons.fact_check_rounded, Color(0xFFF59E0B)),
    (Icons.directions_bus_rounded, Color(0xFF0EA5E9)),
    (Icons.chat_bubble_rounded, Color(0xFFEC4899)),
    (Icons.local_library_rounded, Color(0xFF8B5CF6)),
    (Icons.badge_rounded, Color(0xFF14B8A6)),
    (Icons.event_available_rounded, Color(0xFFEF4444)),
  ];

  @override
  void dispose() { _spin.dispose(); _pulse.dispose(); _in.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final s = widget.size;
    final core = s * 0.34;
    return SizedBox(
      width: s, height: s,
      child: AnimatedBuilder(
        animation: Listenable.merge([_spin, _pulse, _in]),
        builder: (_, __) {
          final grow = Curves.easeOutBack.transform(_in.value.clamp(0, 1));
          final children = <Widget>[];
          // rings
          for (final f in [0.62, 0.98]) {
            children.add(Center(child: Container(width: s * f, height: s * f,
                decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white.withValues(alpha: 0.14), width: 1.2)))));
          }
          // pulse
          final p = _pulse.value;
          children.add(Center(child: Container(width: core * (1 + p * 0.9), height: core * (1 + p * 0.9),
              decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.18 * (1 - p))))));
          // apps on two rings, turning opposite ways
          for (var i = 0; i < _apps.length; i++) {
            final outer = i.isEven;
            final r = (outer ? s * 0.49 : s * 0.31) * grow;
            final dir = outer ? 1 : -1;
            final a = (i / _apps.length) * 2 * math.pi + dir * _spin.value * 2 * math.pi;
            final bubble = outer ? s * 0.15 : s * 0.12;
            final (icon, color) = _apps[i];
            children.add(Positioned(
              left: s / 2 + r * math.cos(a) - bubble / 2, top: s / 2 + r * math.sin(a) - bubble / 2,
              child: Opacity(
                opacity: _in.value.clamp(0, 1),
                child: Container(
                  width: bubble, height: bubble,
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(bubble * 0.32),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.18), blurRadius: 14, offset: const Offset(0, 6))]),
                  child: Icon(icon, color: color, size: bubble * 0.52),
                ),
              ),
            ));
          }
          // the cap
          children.add(Center(child: Transform.scale(
            scale: grow,
            child: Container(
              width: core, height: core,
              decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle,
                  boxShadow: [BoxShadow(color: const Color(0xFF8B93FF).withValues(alpha: 0.6), blurRadius: 40, spreadRadius: 4)]),
              padding: EdgeInsets.all(core * 0.14),
              child: ClipOval(child: Image.asset('assets/images/icon.png', fit: BoxFit.contain)),
            ),
          )));
          children.add(Positioned(
            left: s / 2 + core * 0.18, top: s / 2 + core * 0.22,
            child: Transform.scale(scale: grow, child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: C.brand, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white, width: 2)),
              child: const Text('360', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1)),
            )),
          ));
          return Stack(clipBehavior: Clip.none, children: children);
        },
      ),
    );
  }
}
