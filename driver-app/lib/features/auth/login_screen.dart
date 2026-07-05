import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';

/// Driver login: School Code + Driver ID/Email + Password (matches design).
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
  bool _remember = false;

  @override
  void dispose() {
    _school.dispose();
    _id.dispose();
    _pass.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_school.text.isEmpty || _id.text.isEmpty || _pass.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill in all fields')));
      return;
    }
    final ok = await ref.read(authControllerProvider.notifier).login(_school.text.trim(), _id.text.trim(), _pass.text);
    if (!mounted) return;
    if (ok) {
      context.go('/');
    } else {
      final err = ref.read(authControllerProvider).error;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err?.message ?? 'Login failed')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    return Scaffold(
      backgroundColor: const Color(0xFFEAF5EE),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const SizedBox(height: 32),
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(20)),
                child: const Icon(Icons.directions_bus_rounded, color: Colors.white, size: 36),
              ),
              const SizedBox(height: 16),
              const Text('ShuleCloud', style: TextStyle(color: AppColors.primary, fontSize: 30, fontWeight: FontWeight.w800)),
              const Text('Driver Logistics Management', style: TextStyle(color: AppColors.textMuted, fontSize: 15)),
              const SizedBox(height: 28),
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
                child: Column(
                  children: [
                    TextField(
                      controller: _school,
                      textCapitalization: TextCapitalization.none,
                      decoration: const InputDecoration(hintText: 'School Code (e.g. kilimo)'),
                    ),
                    const SizedBox(height: 16),
                    TextField(controller: _id, decoration: const InputDecoration(hintText: 'Driver ID or Email')),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _pass,
                      obscureText: _obscure,
                      decoration: InputDecoration(
                        hintText: 'Password',
                        suffixIcon: IconButton(
                          icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Checkbox(value: _remember, onChanged: (v) => setState(() => _remember = v ?? false)),
                        const Text('Remember Me'),
                        const Spacer(),
                        TextButton(onPressed: () {}, child: const Text('Forgot Password?')),
                      ],
                    ),
                    const SizedBox(height: 8),
                    FilledButton.icon(
                      onPressed: auth.loading ? null : _submit,
                      icon: auth.loading
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.login),
                      label: Text(auth.loading ? 'Signing in…' : 'Sign In'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.help_outline),
                label: const Text('Need help? Contact Support'),
              ),
              const SizedBox(height: 24),
              const Text('v1.0.0  ·  SERVER ONLINE', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
