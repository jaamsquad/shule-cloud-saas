import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';

/// Two-tone login card mirroring the web PortalLogin.tsx: gold greeting band
/// over a green form panel, crest circle on the seam, navy "Log In" button.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _school = TextEditingController();
  final _id = TextEditingController();
  final _pass = TextEditingController();
  bool _obscure = true;
  bool _remember = true;
  String? _error;

  @override
  void dispose() {
    _school.dispose();
    _id.dispose();
    _pass.dispose();
    super.dispose();
  }

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    setState(() => _error = null);
    if (_school.text.trim().isEmpty || _id.text.trim().isEmpty || _pass.text.isEmpty) {
      setState(() => _error = 'Fill in your School ID, Username and Password.');
      return;
    }
    try {
      await ref.read(authControllerProvider.notifier).login(
            schoolId: _school.text.trim(),
            username: _id.text.trim(),
            password: _pass.text,
            rememberMe: _remember,
          );
      if (mounted && ref.read(authControllerProvider).isAuthenticated) context.go('/');
    } catch (e) {
      setState(() => _error = 'Login failed. Check your School ID, Username and Password.');
    }
  }

  void _forgot() {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Forgot your password?'),
        content: const Text(
          'Student portal logins are issued by your school. '
          'Ask your class teacher or the school office to reset your password.',
          style: TextStyle(color: AppColors.slate600),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authControllerProvider).loading;
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F9),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(children: [
                Container(
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 40, offset: Offset(0, 16))],
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    // Gold greeting band
                    Container(
                      color: AppColors.gold,
                      padding: const EdgeInsets.fromLTRB(28, 28, 28, 40),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('$_greeting !', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.loginInk)),
                        const SizedBox(height: 4),
                        const Text('Login to continue to Student Portal.',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF2A4A37))),
                        const Text('ShuleCloud School System',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xCC2A4A37))),
                      ]),
                    ),

                    // Teal form panel with the crest on the seam
                    Stack(clipBehavior: Clip.none, children: [
                      Container(
                        color: AppColors.accent,
                        padding: const EdgeInsets.fromLTRB(28, 48, 28, 28),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                          if (_error != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFE4E6),
                                border: Border.all(color: const Color(0xFFFDA4AF)),
                                borderRadius: BorderRadius.circular(AppTheme.radius),
                              ),
                              child: Text(_error!, style: const TextStyle(color: Color(0xFFBE123C), fontSize: 12.5, fontWeight: FontWeight.w600)),
                            ),
                            const SizedBox(height: 16),
                          ],
                          _label('School ID'),
                          _input(_school, hint: 'e.g. A482917M', icon: Icons.apartment_outlined, action: TextInputAction.next, caps: true),
                          const SizedBox(height: 16),
                          _label('Username'),
                          _input(_id, hint: 'Enter portal username', icon: Icons.badge_outlined, action: TextInputAction.next),
                          const SizedBox(height: 16),
                          _label('Password'),
                          _input(
                            _pass,
                            hint: 'Enter password',
                            icon: Icons.lock_outline,
                            obscure: _obscure,
                            action: TextInputAction.done,
                            onSubmitted: (_) => _submit(),
                            suffix: IconButton(
                              icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, color: AppColors.slate400, size: 20),
                              onPressed: () => setState(() => _obscure = !_obscure),
                            ),
                          ),
                          const SizedBox(height: 12),
                          InkWell(
                            onTap: () => setState(() => _remember = !_remember),
                            child: Row(children: [
                              SizedBox(
                                width: 24,
                                height: 24,
                                child: Checkbox(
                                  value: _remember,
                                  onChanged: (v) => setState(() => _remember = v ?? true),
                                  side: const BorderSide(color: Colors.white, width: 1.5),
                                  fillColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? Colors.white : Colors.transparent),
                                  checkColor: AppColors.accent,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Text('Remember me', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
                            ]),
                          ),
                          const SizedBox(height: 20),
                          SizedBox(
                            height: 46,
                            child: FilledButton(
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.navy,
                                disabledBackgroundColor: AppColors.navy.withValues(alpha: 0.6),
                              ),
                              onPressed: loading ? null : _submit,
                              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                                if (loading) ...[
                                  const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                                  const SizedBox(width: 8),
                                ],
                                Text(loading ? 'Signing in...' : 'Log In'),
                              ]),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Align(
                            alignment: Alignment.centerRight,
                            child: InkWell(
                              onTap: _forgot,
                              child: const Padding(
                                padding: EdgeInsets.symmetric(vertical: 4),
                                child: Row(mainAxisSize: MainAxisSize.min, children: [
                                  Icon(Icons.lock, size: 12, color: AppColors.navy),
                                  SizedBox(width: 4),
                                  Text('Forgot your password?', style: TextStyle(color: AppColors.navy, fontSize: 12, fontWeight: FontWeight.w800)),
                                ]),
                              ),
                            ),
                          ),
                        ]),
                      ),
                      Positioned(
                        top: -28,
                        left: 28,
                        child: Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                            boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 8, offset: Offset(0, 2))],
                          ),
                          child: const Icon(Icons.school_outlined, color: AppColors.accent, size: 28),
                        ),
                      ),
                    ]),
                  ]),
                ),
                const SizedBox(height: 16),
                const Text('POWERED BY SHULECLOUD ERP',
                    style: TextStyle(color: AppColors.slate400, fontSize: 10, letterSpacing: 1.4, fontWeight: FontWeight.w800)),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
      );

  Widget _input(
    TextEditingController c, {
    required String hint,
    required IconData icon,
    bool obscure = false,
    Widget? suffix,
    TextInputAction? action,
    ValueChanged<String>? onSubmitted,
    bool caps = false,
  }) {
    final border = OutlineInputBorder(borderRadius: BorderRadius.circular(AppTheme.radius), borderSide: BorderSide.none);
    return TextField(
      controller: c,
      obscureText: obscure,
      textInputAction: action,
      onSubmitted: onSubmitted,
      autocorrect: false,
      textCapitalization: caps ? TextCapitalization.characters : TextCapitalization.none,
      style: const TextStyle(color: AppColors.slate800, fontSize: 14),
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: Icon(icon, size: 20),
        suffixIcon: suffix,
        filled: true,
        fillColor: Colors.white,
        border: border,
        enabledBorder: border,
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTheme.radius),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.6), width: 2),
        ),
      ),
    );
  }
}
