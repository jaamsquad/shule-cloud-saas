import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';

/// Parent login — School Code + email/phone + password, Remember Me.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _school = TextEditingController();
  final _id = TextEditingController();
  final _pass = TextEditingController();
  bool _remember = true;
  bool _obscure = true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _school.dispose(); _id.dispose(); _pass.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_school.text.trim().isEmpty || _id.text.trim().isEmpty || _pass.text.isEmpty) {
      setState(() => _error = 'Please fill in all fields.');
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      await ref.read(authControllerProvider.notifier).login(
            schoolCode: _school.text.trim(), identifier: _id.text.trim(),
            password: _pass.text, rememberMe: _remember,
          );
      if (!mounted) return;
      final many = ref.read(authControllerProvider).students.length > 1;
      context.go(many ? '/select' : '/');
    } catch (e) {
      setState(() => _error = 'Login failed. Check your School Code and credentials.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceContainerLow,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 24),
              Container(
                width: 72, height: 72,
                decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(20)),
                child: const Icon(Icons.school_rounded, color: Colors.white, size: 40),
              ),
              const SizedBox(height: 16),
              const Text('ShuleCloud Parent', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              const Text("Secure access to your child's academic progress and school communication.",
                  textAlign: TextAlign.center, style: TextStyle(color: AppColors.onSurfaceVariant)),
              const SizedBox(height: 28),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _label('School Code'),
                    TextField(controller: _school, textCapitalization: TextCapitalization.none,
                        decoration: const InputDecoration(hintText: 'e.g. kilimo', prefixIcon: Icon(Icons.apartment))),
                    const SizedBox(height: 16),
                    _label('Parent Email or Phone'),
                    TextField(controller: _id, decoration: const InputDecoration(hintText: 'name@email.com', prefixIcon: Icon(Icons.alternate_email))),
                    const SizedBox(height: 16),
                    _label('Password'),
                    TextField(
                      controller: _pass, obscureText: _obscure,
                      decoration: InputDecoration(
                        hintText: '••••••••', prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility), onPressed: () => setState(() => _obscure = !_obscure)),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Checkbox(value: _remember, onChanged: (v) => setState(() => _remember = v ?? true)),
                        const Text('Remember Me'),
                        const Spacer(),
                        TextButton(onPressed: () {}, child: const Text('Forgot Password?')),
                      ],
                    ),
                    if (_error != null) Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 13)),
                    ),
                    FilledButton.icon(
                      onPressed: _busy ? null : _login,
                      icon: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.login),
                      label: Text(_busy ? 'Signing in…' : 'Login'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              const Text('ShuleCloud © 2024 · Empowering education through technology',
                  textAlign: TextAlign.center, style: TextStyle(color: AppColors.outline, fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(t, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.onSurface)),
      );
}
