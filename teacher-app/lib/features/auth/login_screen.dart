import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';

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
  String? _error;

  @override
  void dispose() {
    _school.dispose();
    _id.dispose();
    _pass.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (_school.text.trim().isEmpty || _id.text.trim().isEmpty || _pass.text.isEmpty) {
      setState(() => _error = 'Fill in your School Code, Employee Number and Password.');
      return;
    }
    try {
      await ref.read(authControllerProvider.notifier).login(
            schoolCode: _school.text.trim(), username: _id.text.trim(), password: _pass.text,
          );
      if (mounted && ref.read(authControllerProvider).isAuthenticated) context.go('/');
    } catch (e) {
      setState(() => _error = 'Login failed. Check your School Code, Employee Number and Password.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authControllerProvider).loading;
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 40),
              Container(
                width: 72, height: 72,
                decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(20)),
                child: const Icon(Icons.school_rounded, color: Colors.white, size: 40),
              ),
              const SizedBox(height: 16),
              const Text('ShuleCloud Teacher', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.onSurface)),
              const SizedBox(height: 6),
              const Text('Sign in to manage your classes, attendance and grading.',
                  style: TextStyle(color: AppColors.onSurfaceVariant)),
              const SizedBox(height: 28),
              TextField(controller: _school, textCapitalization: TextCapitalization.none,
                  decoration: const InputDecoration(labelText: 'School Code', hintText: 'e.g. kilimo', prefixIcon: Icon(Icons.apartment))),
              const SizedBox(height: 12),
              TextField(controller: _id, decoration: const InputDecoration(labelText: 'Employee Number', hintText: 'e.g. SCT-88420', prefixIcon: Icon(Icons.badge_outlined))),
              const SizedBox(height: 12),
              TextField(
                controller: _pass, obscureText: _obscure,
                decoration: InputDecoration(
                  labelText: 'Password', hintText: '••••••••', prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined), onPressed: () => setState(() => _obscure = !_obscure)),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 13)),
              ],
              const SizedBox(height: 20),
              FilledButton(onPressed: loading ? null : _submit,
                  child: loading ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Sign In')),
              const SizedBox(height: 12),
              TextButton(onPressed: () {}, child: const Text('Forgot Password?')),
            ],
          ),
        ),
      ),
    );
  }
}
