import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/theme/app_theme.dart';
import '../providers/providers.dart';
import '../services/google_auth_service.dart';
import 'app_widgets.dart';

/// The four-colour Google "G", drawn so no image asset is needed.
class GoogleMark extends StatelessWidget {
  final double size;
  const GoogleMark({super.key, this.size = 20});
  @override
  Widget build(BuildContext context) => SizedBox(width: size, height: size, child: CustomPaint(painter: _GPainter()));
}

class _GPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size s) {
    final w = s.width * 0.2;
    final r = Rect.fromLTWH(w / 2, w / 2, s.width - w, s.height - w);
    Paint p(Color c) => Paint()..color = c..style = PaintingStyle.stroke..strokeWidth = w;
    const d = math.pi / 180;
    canvas.drawArc(r, -40 * d, -95 * d, false, p(const Color(0xFFEA4335)));  // red (top)
    canvas.drawArc(r, -135 * d, -95 * d, false, p(const Color(0xFFFBBC05))); // yellow (left)
    canvas.drawArc(r, 130 * d, -95 * d, false, p(const Color(0xFF34A853))); // green (bottom)
    canvas.drawArc(r, 35 * d, -75 * d, false, p(const Color(0xFF4285F4)));   // blue (right)
    canvas.drawLine(Offset(s.width / 2, s.height / 2), Offset(s.width - w / 2, s.height / 2), p(const Color(0xFF4285F4)));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

final accountSecurityProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) => ref.read(authRepoProvider).accountSecurity());

/// "Sign-in & Security" panel: link / unlink a Google account for one-tap sign-in.
class GoogleLinkPanel extends ConsumerStatefulWidget {
  const GoogleLinkPanel({super.key});
  @override
  ConsumerState<GoogleLinkPanel> createState() => _GoogleLinkPanelState();
}

class _GoogleLinkPanelState extends ConsumerState<GoogleLinkPanel> {
  bool _busy = false;

  void _toast(String m, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m), backgroundColor: error ? AppColors.error : AppColors.teal));
  }

  Future<void> _link() async {
    setState(() => _busy = true);
    try {
      final email = await ref.read(authRepoProvider).linkGoogle();
      _toast('Linked $email. Use “Continue with Google” next time you sign in.');
      ref.invalidate(accountSecurityProvider);
    } catch (e) {
      _toast(GoogleAuthService.messageOf(e), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _unlink() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Unlink Google?'),
        content: const Text('You will sign in with your Employee Number and password again.', style: TextStyle(color: AppColors.slate600)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Unlink')),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _busy = true);
    try {
      await ref.read(authRepoProvider).unlinkGoogle();
      _toast('Google account unlinked');
      ref.invalidate(accountSecurityProvider);
    } catch (e) {
      _toast(GoogleAuthService.messageOf(e), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(accountSecurityProvider);
    return PanelCard(
      title: 'Sign-in & Security',
      icon: Icons.verified_user_outlined,
      child: async.when(
        loading: () => const Padding(padding: EdgeInsets.all(8), child: Center(child: CircularProgressIndicator(strokeWidth: 2))),
        error: (e, _) => Text('Could not load sign-in settings.', style: const TextStyle(color: AppColors.slate500)),
        data: (d) {
          final g = Map<String, dynamic>.from((d['google'] ?? {}) as Map);
          final enabled = g['enabled'] == true;
          final linked = g['linked'] == true;
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
                child: const Center(child: GoogleMark(size: 20)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Google account', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate800)),
                  const SizedBox(height: 2),
                  Text(
                    !enabled
                        ? 'Google sign-in is not switched on for schools yet.'
                        : linked
                            ? 'Linked to ${g['email']}'
                            : 'Link Google to sign in with one tap — no password.',
                    style: const TextStyle(color: AppColors.slate500, fontSize: 12.5),
                  ),
                ]),
              ),
            ]),
            if (enabled) ...[
              const SizedBox(height: 12),
              linked
                  ? OutlinedButton.icon(
                      onPressed: _busy ? null : _unlink,
                      icon: _busy ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.link_off, size: 18),
                      label: const Text('Unlink Google'),
                    )
                  : FilledButton.icon(
                      style: FilledButton.styleFrom(backgroundColor: AppColors.teal),
                      onPressed: _busy ? null : _link,
                      icon: _busy ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.link, size: 18),
                      label: const Text('Link Google account'),
                    ),
            ],
          ]);
        },
      ),
    );
  }
}
