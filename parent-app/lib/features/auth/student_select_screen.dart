import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/app_theme.dart';
import '../../models/student.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_widgets.dart';

/// "Welcome back, Parent" — pick a child to view their dashboard.
class StudentSelectScreen extends ConsumerWidget {
  const StudentSelectScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final students = ref.watch(authControllerProvider).students;
    return Scaffold(
      appBar: AppBar(title: const Text('ShuleCloud'), actions: const [Icon(Icons.notifications_none), SizedBox(width: 16)]),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Welcome back, Parent', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.onSurface)),
          const SizedBox(height: 4),
          const Text('Select a student profile to view their detailed academic and financial dashboard.',
              style: TextStyle(color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 16),
          for (final s in students) ...[
            _StudentCard(
              student: s,
              accent: students.indexOf(s).isEven ? AppColors.primary : AppColors.secondary,
              onOpen: () { ref.read(authControllerProvider.notifier).selectStudent(s.id); context.go('/'); },
            ),
            const SizedBox(height: 16),
          ],
          _enrollCard(),
          const SizedBox(height: 16),
          _assistCard(context),
        ],
      ),
    );
  }

  Widget _enrollCard() => DottedCard(
        child: Column(
          children: [
            Container(width: 48, height: 48, decoration: BoxDecoration(color: AppColors.surfaceContainerHigh, shape: BoxShape.circle),
                child: const Icon(Icons.person_add_alt, color: AppColors.secondary)),
            const SizedBox(height: 8),
            const Text('Enroll New Student', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.onSurface)),
            const SizedBox(height: 4),
            const Text('Link another child to your ShuleCloud Parent account.',
                textAlign: TextAlign.center, style: TextStyle(color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 8),
            TextButton.icon(onPressed: () {}, icon: const Icon(Icons.open_in_new, size: 16), label: const Text('Learn more')),
          ],
        ),
      );

  Widget _assistCard(BuildContext context) => AppCard(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Container(width: 44, height: 44, decoration: BoxDecoration(color: AppColors.primaryContainer.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.help_outline, color: AppColors.primary)),
              const SizedBox(width: 12),
              const Expanded(child: Text('Need Assistance?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.onSurface))),
            ]),
            const SizedBox(height: 8),
            const Text('Contact our school administration for help with enrollment or login.',
                style: TextStyle(color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: FilledButton(onPressed: () {}, child: const Text('Contact Support'))),
              const SizedBox(width: 12),
              Expanded(child: OutlinedButton(onPressed: () {}, child: const Text('FAQs'))),
            ]),
          ],
        ),
      );
}

class _StudentCard extends StatelessWidget {
  final Student student;
  final Color accent;
  final VoidCallback onOpen;
  const _StudentCard({required this.student, required this.accent, required this.onOpen});

  @override
  Widget build(BuildContext context) => AppCard(
        accent: accent,
        child: Column(
          children: [
            Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(28),
                  child: student.photoUrl != null
                      ? CachedNetworkImage(imageUrl: student.photoUrl!, width: 56, height: 56, fit: BoxFit.cover)
                      : Container(width: 56, height: 56, color: accent.withValues(alpha: 0.12), child: Icon(Icons.person, color: accent)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(student.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.onSurface)),
                      Text('Adm: ${student.admissionNo}', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(999)),
                  child: Text(student.status.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _mini('Attendance', '${student.attendanceRate.toStringAsFixed(1)}%', AppColors.primary, Icons.event_available)),
                const SizedBox(width: 12),
                Expanded(child: _mini('Fee Balance', student.feeBalance <= 0 ? 'Cleared' : ksh(student.feeBalance),
                    student.feeBalance <= 0 ? AppColors.primary : AppColors.tertiary, Icons.account_balance_wallet)),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(width: double.infinity, child: FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: accent),
              onPressed: onOpen, icon: const Icon(Icons.arrow_forward), label: const Text('View Dashboard'))),
          ],
        ),
      );

  Widget _mini(String label, String value, Color color, IconData icon) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.surfaceContainerLow, borderRadius: BorderRadius.circular(12)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [Icon(icon, size: 14, color: color), const SizedBox(width: 4),
              Text(label, style: const TextStyle(fontSize: 11, color: AppColors.onSurfaceVariant))]),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color)),
          ],
        ),
      );
}

/// Dashed enroll card wrapper.
class DottedCard extends StatelessWidget {
  final Widget child;
  const DottedCard({super.key, required this.child});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.outlineVariant, style: BorderStyle.solid, width: 1.5),
        ),
        child: child,
      );
}
