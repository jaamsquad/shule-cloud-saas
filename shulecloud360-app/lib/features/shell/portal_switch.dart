import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../core/theme.dart';

/// Admin portal | Teacher portal — only for staff who were given both.
/// Teacher-only staff never see it; they stay in the teacher portal.
class PortalSwitch extends ConsumerWidget {
  final bool onDark;
  final VoidCallback? onSwitched;
  const PortalSwitch({super.key, this.onDark = false, this.onSwitched});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(sessionProvider).valueOrNull;
    if (s == null || !s.hasBothPortals) return const SizedBox.shrink();
    final teaching = s.teaching;
    Widget seg(String label, IconData icon, bool on, String portal) => Expanded(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: on ? null : () async {
              await ref.read(sessionProvider.notifier).switchPortal(portal);
              onSwitched?.call();
              if (context.mounted) {
                context.go('/');
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(portal == 'teacher' ? 'Switched to the Teacher portal' : 'Switched to the Admin portal')));
              }
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              padding: const EdgeInsets.symmetric(vertical: 9),
              decoration: BoxDecoration(
                gradient: on && !onDark ? const LinearGradient(colors: [C.sky, C.blue]) : null,
                color: on && onDark ? Colors.white : null,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(icon, size: 16, color: on ? (onDark ? C.blue : Colors.white) : (onDark ? Colors.white70 : C.slate500)),
                const SizedBox(width: 6),
                Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: on ? (onDark ? C.blue : Colors.white) : (onDark ? Colors.white70 : C.slate600))),
              ]),
            ),
          ),
        );
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: onDark ? Colors.white.withValues(alpha: 0.16) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: onDark ? Colors.white24 : const Color(0xFFDCE6F5)),
      ),
      child: Row(children: [
        seg('Admin portal', Icons.admin_panel_settings_outlined, !teaching, 'admin'),
        seg('Teacher portal', Icons.co_present_outlined, teaching, 'teacher'),
      ]),
    );
  }
}
