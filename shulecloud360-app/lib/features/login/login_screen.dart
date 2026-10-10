import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import 'motion.dart';
import 'school_lookup.dart';

/// One sign-in for everyone, one step at a time:
///   1. School ID → the school is fetched and shown to pick
///   2. email, username or phone
///   3. password (then the emailed code if the school asks for one)
/// The server decides who you are; the app then shows only your apps.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

enum _Step { school, user, password, otp }

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _schoolId = TextEditingController();
  final _user = TextEditingController();
  final _pass = TextEditingController();
  final _userFocus = FocusNode(), _passFocus = FocusNode();
  _Step _step = _Step.school;
  _Role _role = _Role.staff;
  bool _forward = true, _busy = false, _obscure = true, _picked = true;
  String? _error;
  int _shake = 0;
  SchoolInfo? _found;
  List<SchoolInfo> _recent = const [];
  OtpChallenge? _otp;

  @override
  void initState() {
    super.initState();
    RecentSchools.load().then((r) { if (mounted) setState(() => _recent = r); });
  }

  @override
  void dispose() { _schoolId.dispose(); _user.dispose(); _pass.dispose(); _userFocus.dispose(); _passFocus.dispose(); super.dispose(); }

  void _go(_Step s) {
    FocusScope.of(context).unfocus();
    setState(() { _forward = s.index > _step.index; _step = s; _error = null; });
    // put the cursor in the new step's field once it is on screen
    final node = s == _Step.user ? _userFocus : s == _Step.password ? _passFocus : null;
    if (node != null) WidgetsBinding.instance.addPostFrameCallback((_) { if (mounted && _step == s) node.requestFocus(); });
  }

  void _fail(String msg) => setState(() { _error = msg; _shake++; });

  void _back() {
    switch (_step) {
      case _Step.school: context.go('/welcome');
      case _Step.user: _go(_Step.school);
      case _Step.password: _go(_Step.user);
      case _Step.otp: _pass.clear(); _go(_Step.password);
    }
  }

  // ── step actions ───────────────────────────────────────────────────────────
  Future<void> _findSchool() async {
    FocusScope.of(context).unfocus();
    if (_schoolId.text.trim().isEmpty) return _fail('Enter your School ID.');
    setState(() { _busy = true; _error = null; });
    try {
      final s = await findSchool(_schoolId.text);
      if (mounted) setState(() { _found = s; _picked = true; });
    } catch (e) {
      if (mounted) _fail(errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _pickRecent(SchoolInfo s) => setState(() { _found = s; _picked = true; _schoolId.text = s.code; _error = null; });

  Future<void> _confirmSchool() async {
    if (_found == null || !_picked) return;
    await RecentSchools.remember(_found!);
    _go(_Step.user);
  }

  void _confirmUser() {
    if (_user.text.trim().isEmpty) return _fail('Enter your email, username or phone number.');
    _go(_Step.password);
  }

  Future<void> _signIn() async {
    FocusScope.of(context).unfocus();
    if (_pass.text.isEmpty) return _fail('Enter your password.');
    setState(() { _busy = true; _error = null; });
    try {
      final otp = await ref.read(sessionProvider.notifier).login(schoolCode: _found!.code, username: _user.text, password: _pass.text);
      if (otp != null && mounted) setState(() { _otp = otp; _forward = true; _step = _Step.otp; });
    } catch (e) {
      if (mounted) _fail(errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  // ── layout ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) { if (!didPop) _back(); },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: Stack(children: [
          const Positioned(left: 0, right: 0, top: 0, height: 360, child: Aurora()),
          SafeArea(
            child: Column(children: [
              _TopBar(step: _step, onBack: _back),
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 420),
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 420),
                        switchInCurve: Curves.easeOutCubic, switchOutCurve: Curves.easeInCubic,
                        layoutBuilder: (cur, prev) => Stack(alignment: Alignment.topCenter, children: [...prev, if (cur != null) cur]),
                        transitionBuilder: (child, anim) {
                          final incoming = child.key == ValueKey(_step);
                          final dx = (incoming ? 1 : -1) * (_forward ? 1 : -1) * 0.18;
                          return FadeTransition(opacity: anim, child: SlideTransition(position: Tween(begin: Offset(dx, 0), end: Offset.zero).animate(anim), child: child));
                        },
                        child: KeyedSubtree(key: ValueKey(_step), child: _body()),
                      ),
                    ),
                  ),
                ),
              ),
            ]),
          ),
        ]),
      ),
    );
  }

  Widget _body() => switch (_step) {
        _Step.school => _schoolStep(),
        _Step.user => _userStep(),
        _Step.password => _passwordStep(),
        _Step.otp => _OtpPanel(challenge: _otp!, onBack: _back),
      };

  Widget _stagger(List<Widget> items) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        for (var i = 0; i < items.length; i++) Rise(delay: Duration(milliseconds: 60 * i), child: items[i]),
      ]);

  Widget _errorBox() => AnimatedSize(
        duration: const Duration(milliseconds: 250), curve: Curves.easeOut,
        child: _error == null
            ? const SizedBox(width: double.infinity)
            : Shake(
                trigger: _shake,
                child: Container(
                  margin: const EdgeInsets.only(top: 14),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: const Color(0xFFFFF1F2), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFECDD3))),
                  child: Row(children: [
                    const Icon(Icons.error_outline_rounded, color: C.red, size: 19), const SizedBox(width: 8),
                    Expanded(child: Text(_error!, style: const TextStyle(color: Color(0xFFBE123C), fontWeight: FontWeight.w600, fontSize: 13))),
                  ]),
                ),
              ),
      );

  // 1 ── School ID
  Widget _schoolStep() {
    final found = _found;
    return _stagger([
      const _Heading(icon: Icons.apartment_rounded, title: 'Find your school', subtitle: 'Enter the School ID your school gave you.'),
      Shake(
        trigger: _shake,
        child: TextField(
          controller: _schoolId, autofocus: _recent.isEmpty, autocorrect: false, enableSuggestions: false,
          textCapitalization: TextCapitalization.characters, textInputAction: TextInputAction.search,
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9.\-]')), LengthLimitingTextInputFormatter(40)],
          onChanged: (_) { if (_found != null || _error != null) setState(() { _found = null; _error = null; }); },
          onSubmitted: (_) => found == null ? _findSchool() : _confirmSchool(),
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: 3, color: C.ink),
          decoration: _field('A482917M', Icons.tag_rounded),
        ),
      ),
      _errorBox(),
      AnimatedSize(
        duration: const Duration(milliseconds: 380), curve: Curves.easeOutCubic,
        child: found == null
            ? const SizedBox(width: double.infinity)
            : Padding(
                padding: const EdgeInsets.only(top: 16),
                child: TweenAnimationBuilder<double>(
                  key: ValueKey(found.code), tween: Tween(begin: 0, end: 1), duration: const Duration(milliseconds: 520), curve: Curves.easeOutBack,
                  builder: (_, v, child) => Opacity(opacity: v.clamp(0, 1), child: Transform.scale(scale: 0.9 + 0.1 * v, child: child)),
                  child: _SchoolCard(school: found, selected: _picked, onTap: () => setState(() => _picked = !_picked)),
                ),
              ),
      ),
      const SizedBox(height: 20),
      BrandButton(
        label: found == null ? 'Find school' : 'Continue',
        icon: found == null ? Icons.search_rounded : Icons.arrow_forward_rounded,
        busy: _busy,
        onTap: found == null ? _findSchool : (_picked ? _confirmSchool : null),
      ),
      if (found == null && _recent.isNotEmpty) ...[
        const SizedBox(height: 26),
        const Text('RECENT SCHOOLS', style: TextStyle(fontSize: 11, letterSpacing: 1.2, fontWeight: FontWeight.w800, color: C.slate400)),
        const SizedBox(height: 8),
        for (final s in _recent)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _SchoolCard(school: s, compact: true, onTap: () => _pickRecent(s), onRemove: () async {
              await RecentSchools.forget(s);
              setState(() => _recent = _recent.where((x) => x.code != s.code).toList());
            }),
          ),
      ],
      const SizedBox(height: 18),
      const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(Icons.info_outline_rounded, size: 16, color: C.slate400), SizedBox(width: 6),
        Expanded(child: Text('Your School ID looks like A482917M. Find it on the school website or your fee statement.', style: TextStyle(fontSize: 12.5, color: C.slate500, height: 1.35))),
      ]),
    ]);
  }

  // 2 ── who
  Widget _userStep() {
    final r = _role;
    return _stagger([
      _CrestCard(school: _found!, onChange: () => _go(_Step.school)),
      const SizedBox(height: 18),
      Container(
        padding: const EdgeInsets.fromLTRB(14, 16, 14, 16),
        decoration: BoxDecoration(color: const Color(0xFFEFF5FF), borderRadius: BorderRadius.circular(24)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('Login to your Account', textAlign: TextAlign.center, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: C.slate700)),
          const SizedBox(height: 12),
          _RoleToggle(value: r, onChanged: (v) => setState(() { _role = v; _error = null; })),
          const SizedBox(height: 14),
          Shake(
            trigger: _shake,
            child: TextField(
              controller: _user, focusNode: _userFocus, autocorrect: false, enableSuggestions: false,
              keyboardType: r.keyboard, textInputAction: TextInputAction.go,
              autofillHints: const [AutofillHints.username, AutofillHints.email],
              onChanged: (_) => setState(() => _error = null), onSubmitted: (_) => _confirmUser(),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: C.ink),
              decoration: _field(r.hint, r.icon).copyWith(fillColor: Colors.white),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(top: 8, left: 4),
            child: Text(r.help, style: const TextStyle(fontSize: 12, color: C.slate500)),
          ),
          _errorBox(),
          const SizedBox(height: 16),
          BrandButton(label: 'Continue', onTap: _confirmUser),
        ]),
      ),
    ]);
  }

  // 3 ── password
  Widget _passwordStep() => _stagger([
        _SchoolChip(school: _found!, onChange: () => _go(_Step.school)),
        const SizedBox(height: 14),
        _UserChip(name: _user.text.trim(), onChange: () => _go(_Step.user)),
        const SizedBox(height: 22),
        const _Heading(icon: Icons.lock_rounded, title: 'Enter your password', subtitle: 'Keep it private — the school will never ask for it.'),
        Shake(
          trigger: _shake,
          child: TextField(
            controller: _pass, focusNode: _passFocus, obscureText: _obscure, textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.password],
            onChanged: (_) { if (_error != null) setState(() => _error = null); }, onSubmitted: (_) => _signIn(),
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: C.ink),
            decoration: _field('Password', Icons.key_rounded).copyWith(
              suffixIcon: IconButton(
                icon: AnimatedSwitcher(duration: const Duration(milliseconds: 200), child: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, key: ValueKey(_obscure))),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
          ),
        ),
        _errorBox(),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => showDialog<void>(context: context, builder: (c) => AlertDialog(
              title: const Text('Forgot your password?'),
              content: const Text('Staff and admins can reset it from the school website sign-in page. Learners and parents: ask the school office to reset your portal password.', style: TextStyle(color: C.slate600)),
              actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
            )),
            child: const Text('Forgot password?'),
          ),
        ),
        const SizedBox(height: 6),
        BrandButton(label: 'Sign in', icon: Icons.login_rounded, busy: _busy, onTap: _signIn),
      ]);

  InputDecoration _field(String hint, IconData icon) => InputDecoration(
        hintText: hint,
        prefixIcon: AnimatedSwitcher(duration: const Duration(milliseconds: 200), child: Icon(icon, key: ValueKey(icon), color: C.slate400)),
        filled: true, fillColor: C.bg,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: C.slate200)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: C.slate200)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: C.brand, width: 2)),
      );
}

// ── pieces ───────────────────────────────────────────────────────────────────
class _TopBar extends StatelessWidget {
  final _Step step;
  final VoidCallback onBack;
  const _TopBar({required this.step, required this.onBack});

  @override
  Widget build(BuildContext context) {
    final n = step == _Step.otp ? 3 : step.index + 1;
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 4, 20, 4),
      child: Row(children: [
        IconButton(onPressed: onBack, icon: const Icon(Icons.arrow_back_rounded), color: C.slate700, tooltip: 'Back'),
        const SizedBox(width: 4),
        Expanded(
          child: Row(children: [
            for (var i = 1; i <= 3; i++) ...[
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: Stack(children: [
                    Container(height: 6, color: C.slate200),
                    AnimatedFractionallySizedBox(
                      duration: const Duration(milliseconds: 500), curve: Curves.easeOutCubic,
                      widthFactor: i <= n ? 1 : 0,
                      child: Container(height: 6, decoration: const BoxDecoration(gradient: LinearGradient(colors: [C.brand, C.blue]))),
                    ),
                  ]),
                ),
              ),
              if (i < 3) const SizedBox(width: 6),
            ],
          ]),
        ),
        const SizedBox(width: 12),
        Text(step == _Step.otp ? 'Verify' : 'Step $n of 3', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: C.slate500)),
      ]),
    );
  }
}

class _Heading extends StatelessWidget {
  final IconData icon;
  final String title, subtitle;
  const _Heading({required this.icon, required this.title, required this.subtitle});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 54, height: 54,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [C.brand, C.blue], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(17),
              boxShadow: [BoxShadow(color: C.brand.withValues(alpha: 0.35), blurRadius: 16, offset: const Offset(0, 7))],
            ),
            child: Icon(icon, color: Colors.white, size: 27),
          ),
          const SizedBox(height: 18),
          Text(title, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: C.ink, letterSpacing: -0.4)),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(fontSize: 14.5, color: C.slate500, height: 1.35)),
        ]),
      );
}

/// A found or recent school. Tap to pick it.
class _SchoolCard extends StatelessWidget {
  final SchoolInfo school;
  final bool selected, compact;
  final VoidCallback onTap;
  final VoidCallback? onRemove;
  const _SchoolCard({required this.school, required this.onTap, this.selected = false, this.compact = false, this.onRemove});

  @override
  Widget build(BuildContext context) {
    final sub = school.subtitle;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      decoration: BoxDecoration(
        color: selected ? const Color(0xFFEEF0FF) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: selected ? C.brand : C.slate200, width: selected ? 2 : 1),
        boxShadow: selected ? [BoxShadow(color: C.brand.withValues(alpha: 0.18), blurRadius: 20, offset: const Offset(0, 8))] : const [],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: BorderRadius.circular(18), onTap: onTap,
          child: Padding(
            padding: EdgeInsets.all(compact ? 10 : 14),
            child: Row(children: [
              SchoolLogo(school: school, size: compact ? 40 : 56),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(school.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: compact ? 14 : 16, fontWeight: FontWeight.w800, color: C.ink)),
                  if (sub.isNotEmpty && !compact) Padding(padding: const EdgeInsets.only(top: 2), child: Text(sub, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, color: C.slate500))),
                  if (school.schoolId != null) Padding(
                    padding: const EdgeInsets.only(top: 5),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(color: C.slate100, borderRadius: BorderRadius.circular(6)),
                      child: Text('ID ${school.schoolId}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: C.slate600, letterSpacing: 0.6)),
                    ),
                  ),
                ]),
              ),
              if (onRemove != null)
                IconButton(onPressed: onRemove, icon: const Icon(Icons.close_rounded, size: 18), color: C.slate400, tooltip: 'Forget this school')
              else
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  transitionBuilder: (c, a) => ScaleTransition(scale: a, child: c),
                  child: selected
                      ? Container(key: const ValueKey('on'), width: 26, height: 26, decoration: const BoxDecoration(color: C.brand, shape: BoxShape.circle), child: const Icon(Icons.check_rounded, color: Colors.white, size: 18))
                      : Container(key: const ValueKey('off'), width: 26, height: 26, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: C.slate200, width: 2))),
                ),
            ]),
          ),
        ),
      ),
    );
  }
}

class _SchoolChip extends StatelessWidget {
  final SchoolInfo school;
  final VoidCallback onChange;
  const _SchoolChip({required this.school, required this.onChange});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(8, 8, 4, 8),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.9), borderRadius: BorderRadius.circular(16), border: Border.all(color: C.slate200)),
        child: Row(children: [
          SchoolLogo(school: school, size: 36),
          const SizedBox(width: 10),
          Expanded(child: Text(school.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, color: C.ink))),
          TextButton(onPressed: onChange, child: const Text('Change')),
        ]),
      );
}

class _UserChip extends StatelessWidget {
  final String name;
  final VoidCallback onChange;
  const _UserChip({required this.name, required this.onChange});
  @override
  Widget build(BuildContext context) => Row(children: [
        CircleAvatar(radius: 18, backgroundColor: C.brand.withValues(alpha: 0.12),
            child: Text(name.isEmpty ? '?' : name[0].toUpperCase(), style: const TextStyle(color: C.brandDark, fontWeight: FontWeight.w800))),
        const SizedBox(width: 10),
        Expanded(child: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, color: C.slate700))),
        TextButton(onPressed: onChange, child: const Text('Not you?')),
      ]);
}

/// The 6-digit code emailed when the school requires two-step sign-in.
class _OtpPanel extends ConsumerStatefulWidget {
  final OtpChallenge challenge;
  final VoidCallback onBack;
  const _OtpPanel({required this.challenge, required this.onBack});
  @override
  ConsumerState<_OtpPanel> createState() => _OtpPanelState();
}

class _OtpPanelState extends ConsumerState<_OtpPanel> {
  final _code = TextEditingController();
  bool _remember = true, _busy = false;
  String? _msg, _err;
  int _shake = 0;

  @override
  void dispose() { _code.dispose(); super.dispose(); }

  Future<void> _verify() async {
    final code = _code.text.replaceAll(RegExp(r'\D'), '');
    if (code.length != 6) { setState(() { _err = 'Enter the 6-digit code.'; _shake++; }); return; }
    setState(() { _busy = true; _err = null; });
    try {
      await ref.read(sessionProvider.notifier).verifyOtp(widget.challenge, code, _remember);
    } catch (e) {
      if (mounted) setState(() { _err = errorText(e); _shake++; });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Rise(child: _Heading(icon: Icons.mark_email_read_rounded, title: 'Check your email',
            subtitle: 'We sent a 6-digit code to ${widget.challenge.sentTo}. It expires in ${widget.challenge.minutes} minutes.')),
        Rise(
          delay: const Duration(milliseconds: 80),
          child: Shake(
            trigger: _shake,
            child: TextField(
              controller: _code, autofocus: true, keyboardType: TextInputType.number, textAlign: TextAlign.center, maxLength: 6,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly], onChanged: (v) { if (v.length == 6) _verify(); },
              autofillHints: const [AutofillHints.oneTimeCode],
              style: const TextStyle(fontSize: 28, letterSpacing: 14, fontWeight: FontWeight.w800, color: C.ink),
              decoration: InputDecoration(
                counterText: '', hintText: '••••••', filled: true, fillColor: C.bg,
                contentPadding: const EdgeInsets.symmetric(vertical: 18),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: C.slate200)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: C.slate200)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: C.brand, width: 2)),
              ),
            ),
          ),
        ),
        if (_err != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_err!, textAlign: TextAlign.center, style: const TextStyle(color: C.red, fontWeight: FontWeight.w600))),
        if (_msg != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_msg!, textAlign: TextAlign.center, style: const TextStyle(color: C.green))),
        if (widget.challenge.canRemember)
          CheckboxListTile(
            value: _remember, onChanged: (v) => setState(() => _remember = v ?? true), contentPadding: EdgeInsets.zero, controlAffinity: ListTileControlAffinity.leading,
            title: Text("Don't ask again on this phone for ${widget.challenge.trustDays} days", style: const TextStyle(fontSize: 13.5, color: C.slate600)),
          ),
        const SizedBox(height: 8),
        BrandButton(label: 'Verify & sign in', icon: Icons.verified_rounded, busy: _busy, onTap: _verify),
        const SizedBox(height: 6),
        Center(
          child: TextButton(onPressed: () async {
            try { final m = await ref.read(sessionProvider.notifier).resendOtp(widget.challenge); setState(() { _msg = m; _err = null; }); }
            catch (e) { setState(() => _err = errorText(e)); }
          }, child: const Text('Resend code')),
        ),
      ]);
}

/// Who is signing in. Only changes the field's wording and keyboard — the server
/// works out the account from what is typed.
enum _Role {
  staff('Staff', 'Email or username', Icons.mail_outline_rounded, TextInputType.emailAddress, 'Admins, bursars and teachers: your school email or username.'),
  student('Student', 'Admission no. or username', Icons.badge_outlined, TextInputType.text, 'Use the portal username the school gave you.'),
  parent('Parent', 'Phone number', Icons.phone_iphone_rounded, TextInputType.phone, 'The phone number the school has for you.');

  final String label, hint, help;
  final IconData icon;
  final TextInputType keyboard;
  const _Role(this.label, this.hint, this.icon, this.keyboard, this.help);
}

/// Segmented Staff | Student | Parent switch with a sliding pill.
class _RoleToggle extends StatelessWidget {
  final _Role value;
  final ValueChanged<_Role> onChanged;
  const _RoleToggle({required this.value, required this.onChanged});
  @override
  Widget build(BuildContext context) => Container(
        height: 46, padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: const Color(0xFFDCE6F5))),
        child: LayoutBuilder(builder: (_, box) {
          final w = box.maxWidth / _Role.values.length;
          return Stack(children: [
            AnimatedPositioned(
              duration: const Duration(milliseconds: 260), curve: Curves.easeOutCubic,
              left: w * value.index, top: 0, bottom: 0, width: w,
              child: Container(decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [C.sky, C.blue]), borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: C.blue.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 3))],
              )),
            ),
            Row(children: [
              for (final r in _Role.values)
                Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque, onTap: () => onChanged(r),
                    child: Center(child: AnimatedDefaultTextStyle(
                      duration: const Duration(milliseconds: 200),
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: r == value ? Colors.white : C.slate600),
                      child: Text(r.label),
                    )),
                  ),
                ),
            ]),
          ]);
        }),
      );
}

/// The school's crest inside a gold laurel, with its name — the top of the sign-in card.
class _CrestCard extends StatelessWidget {
  final SchoolInfo school;
  final VoidCallback onChange;
  const _CrestCard({required this.school, required this.onChange});
  @override
  Widget build(BuildContext context) => Column(children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          decoration: BoxDecoration(color: const Color(0xFFF7F1EA), borderRadius: BorderRadius.circular(22)),
          child: Column(children: [
            Image.asset('assets/images/logo.png', height: 46, fit: BoxFit.contain),
            const SizedBox(height: 4),
            const Text('Staff, Student & Parent App', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: C.slate700)),
          ]),
        ),
        const SizedBox(height: 18),
        SizedBox(
          width: 170, height: 150,
          child: CustomPaint(
            painter: const _Laurel(),
            child: Center(child: Padding(padding: const EdgeInsets.only(bottom: 6), child: ClipOval(child: SchoolLogo(school: school, size: 92)))),
          ),
        ),
        const SizedBox(height: 8),
        Text(school.name.toUpperCase(), textAlign: TextAlign.center, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: C.ink, letterSpacing: 0.5)),
        if (school.schoolId != null) Text('School ID ${school.schoolId}', style: const TextStyle(fontSize: 12, color: C.slate500, fontWeight: FontWeight.w600)),
        TextButton(onPressed: onChange, child: const Text('Not your school? Change')),
      ]);
}

/// Two golden laurel branches curving up around the crest.
class _Laurel extends CustomPainter {
  const _Laurel();
  @override
  void paint(Canvas c, Size s) {
    final gold = Paint()..shader = const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter,
        colors: [Color(0xFFF5C451), Color(0xFFC8901A)]).createShader(Offset.zero & s);
    final stem = Paint()..color = const Color(0xFFC8901A)..style = PaintingStyle.stroke..strokeWidth = 2.4..strokeCap = StrokeCap.round;
    final cx = s.width / 2, cy = s.height * 0.5, r = s.height * 0.46;
    for (final side in [-1.0, 1.0]) {
      final path = Path();
      for (var i = 0; i <= 20; i++) {
        final a = math.pi / 2 + side * (0.25 + i / 20 * 2.0);
        final p = Offset(cx + r * math.cos(a), cy + r * math.sin(a));
        i == 0 ? path.moveTo(p.dx, p.dy) : path.lineTo(p.dx, p.dy);
      }
      c.drawPath(path, stem);
      for (var i = 0; i < 8; i++) {
        final a = math.pi / 2 + side * (0.4 + i * 0.24);
        final p = Offset(cx + r * math.cos(a), cy + r * math.sin(a));
        for (final out in [1.0, -1.0]) {
          c.save();
          c.translate(p.dx, p.dy);
          c.rotate(a + math.pi / 2 * side + out * 0.55 * side + (out < 0 ? math.pi : 0));
          c.drawOval(Rect.fromCenter(center: const Offset(0, -8), width: 7.5, height: 17), gold);
          c.restore();
        }
      }
    }
  }

  @override
  bool shouldRepaint(_Laurel o) => false;
}
