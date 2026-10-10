import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/session.dart';
import '../../core/theme.dart';

/// One sign-in for everyone: admins, finance, teachers, learners and parents.
/// The server decides who you are; the app then shows only your apps.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _school = TextEditingController();
  final _user = TextEditingController();
  final _pass = TextEditingController();
  bool _obscure = true, _busy = false;
  String? _error;
  OtpChallenge? _otp;

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((p) { final v = p.getString('sc360_school'); if (v != null && mounted) _school.text = v; });
  }

  @override
  void dispose() { _school.dispose(); _user.dispose(); _pass.dispose(); super.dispose(); }

  String? get _hint {
    final u = _user.text.trim();
    if (u.isEmpty) return null;
    if (u.contains('@')) return 'Signing in as school admin or staff';
    if (RegExp(r'^\+?[\d\s]{7,}$').hasMatch(u)) return 'Signing in as a parent (phone number)';
    return 'Signing in as a learner or staff (portal username)';
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (_school.text.trim().isEmpty || _user.text.trim().isEmpty || _pass.text.isEmpty) {
      setState(() => _error = 'Enter your School ID, username and password.');
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      (await SharedPreferences.getInstance()).setString('sc360_school', _school.text.trim());
      final otp = await ref.read(sessionProvider.notifier).login(schoolCode: _school.text, username: _user.text, password: _pass.text);
      if (otp != null && mounted) setState(() => _otp = otp);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: _otp != null
                  ? _OtpPanel(challenge: _otp!, onBack: () => setState(() { _otp = null; _pass.clear(); }))
                  : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      Image.asset('assets/images/logo.png', height: 96, fit: BoxFit.contain),
                      const SizedBox(height: 6),
                      const Text('360', textAlign: TextAlign.center, style: TextStyle(fontSize: 13, letterSpacing: 6, fontWeight: FontWeight.w800, color: C.brand)),
                      const SizedBox(height: 22),
                      const Text('Welcome back', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: C.ink)),
                      const SizedBox(height: 4),
                      const Text('One sign-in for admins, staff, teachers, learners and parents.', style: TextStyle(color: C.slate500)),
                      const SizedBox(height: 22),
                      if (_error != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: const Color(0xFFFFF1F2), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFFECDD3))),
                          child: Row(children: [
                            const Icon(Icons.error_outline, color: C.red, size: 18), const SizedBox(width: 8),
                            Expanded(child: Text(_error!, style: const TextStyle(color: Color(0xFFBE123C), fontWeight: FontWeight.w600, fontSize: 13))),
                          ]),
                        ),
                        const SizedBox(height: 14),
                      ],
                      _label('School ID'),
                      TextField(controller: _school, textCapitalization: TextCapitalization.characters, autocorrect: false, textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(hintText: 'e.g. A482917M', prefixIcon: Icon(Icons.apartment_outlined))),
                      const SizedBox(height: 14),
                      _label('Email, username or phone'),
                      TextField(controller: _user, autocorrect: false, keyboardType: TextInputType.emailAddress, textInputAction: TextInputAction.next,
                          onChanged: (_) => setState(() {}), decoration: const InputDecoration(hintText: 'Your sign-in name', prefixIcon: Icon(Icons.person_outline))),
                      if (_hint != null) Padding(padding: const EdgeInsets.only(top: 6, left: 4), child: Text(_hint!, style: const TextStyle(fontSize: 12, color: C.brandDark, fontWeight: FontWeight.w600))),
                      const SizedBox(height: 14),
                      _label('Password'),
                      TextField(
                        controller: _pass, obscureText: _obscure, textInputAction: TextInputAction.done, onSubmitted: (_) => _submit(),
                        decoration: InputDecoration(hintText: 'Your password', prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined), onPressed: () => setState(() => _obscure = !_obscure))),
                      ),
                      const SizedBox(height: 22),
                      FilledButton(
                        onPressed: _busy ? null : _submit,
                        child: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white)) : const Text('Sign in'),
                      ),
                      const SizedBox(height: 14),
                      TextButton(
                        onPressed: () => showDialog<void>(context: context, builder: (c) => AlertDialog(
                          title: const Text('Forgot your password?'),
                          content: const Text('Staff and admins can reset it from the school website sign-in page. Learners and parents: ask the school office to reset your portal password.', style: TextStyle(color: C.slate600)),
                          actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
                        )),
                        child: const Text('Forgot your password?'),
                      ),
                      const SizedBox(height: 18),
                      const Text('Your School ID is on the school website and your fee statements.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: C.slate400)),
                    ]),
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(String t) => Padding(padding: const EdgeInsets.only(bottom: 6, left: 2), child: Text(t, style: const TextStyle(fontWeight: FontWeight.w600, color: C.slate700, fontSize: 13.5)));
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

  Future<void> _verify() async {
    final code = _code.text.replaceAll(RegExp(r'\D'), '');
    if (code.length != 6) { setState(() => _err = 'Enter the 6-digit code.'); return; }
    setState(() { _busy = true; _err = null; });
    try {
      await ref.read(sessionProvider.notifier).verifyOtp(widget.challenge, code, _remember);
    } catch (e) {
      if (mounted) setState(() => _err = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Center(child: Container(width: 60, height: 60, decoration: BoxDecoration(color: C.brand.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(18)), child: const Icon(Icons.verified_user_outlined, color: C.brand, size: 30))),
        const SizedBox(height: 16),
        const Text('Check your email', textAlign: TextAlign.center, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: C.ink)),
        const SizedBox(height: 6),
        Text('We sent a 6-digit code to ${widget.challenge.sentTo}. It expires in ${widget.challenge.minutes} minutes.', textAlign: TextAlign.center, style: const TextStyle(color: C.slate500)),
        const SizedBox(height: 20),
        TextField(
          controller: _code, autofocus: true, keyboardType: TextInputType.number, textAlign: TextAlign.center, maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly], onChanged: (v) { if (v.length == 6) _verify(); },
          style: const TextStyle(fontSize: 26, letterSpacing: 12, fontWeight: FontWeight.w800),
          decoration: const InputDecoration(counterText: '', hintText: '••••••'),
        ),
        if (_err != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_err!, textAlign: TextAlign.center, style: const TextStyle(color: C.red, fontWeight: FontWeight.w600))),
        if (_msg != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_msg!, textAlign: TextAlign.center, style: const TextStyle(color: C.green))),
        if (widget.challenge.canRemember)
          CheckboxListTile(
            value: _remember, onChanged: (v) => setState(() => _remember = v ?? true), contentPadding: EdgeInsets.zero, controlAffinity: ListTileControlAffinity.leading,
            title: Text("Don't ask again on this phone for ${widget.challenge.trustDays} days", style: const TextStyle(fontSize: 13.5, color: C.slate600)),
          ),
        const SizedBox(height: 8),
        FilledButton(onPressed: _busy ? null : _verify, child: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white)) : const Text('Verify & sign in')),
        const SizedBox(height: 8),
        Row(children: [
          TextButton.icon(onPressed: widget.onBack, icon: const Icon(Icons.arrow_back, size: 18), label: const Text('Back')),
          const Spacer(),
          TextButton(onPressed: () async {
            try { final m = await ref.read(sessionProvider.notifier).resendOtp(widget.challenge); setState(() { _msg = m; _err = null; }); }
            catch (e) { setState(() => _err = errorText(e)); }
          }, child: const Text('Resend code')),
        ]),
      ]);
}
