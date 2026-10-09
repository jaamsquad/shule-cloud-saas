import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../models/staff.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';

/// Class hub. Each action deep-links into the already-built feature screen,
/// pre-scoped to this class/subject — avoids duplicating logic per tab.
class ClassDetailScreen extends ConsumerWidget {
  final ClassAssignment classAssignment;
  const ClassDetailScreen({super.key, required this.classAssignment});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = classAssignment;
    void scoped(String route) {
      ref.read(selectedClassSubjectProvider.notifier).state = ClassSubjectSelection(className: c.className, subject: c.subject);
      context.push(route);
    }

    return PortalPage(
      title: c.className,
      subtitle: c.subject.isEmpty ? null : c.subject,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          PanelCard(
            title: 'Class information',
            icon: Icons.info_outline,
            child: Column(children: [
              InfoField(label: 'Class', value: c.className),
              const Divider(),
              InfoField(label: 'Subject', value: c.subject),
              const Divider(),
              InfoField(label: 'Students', value: '${c.studentCount}'),
              const Divider(),
              InfoField(label: 'Role', value: c.isClassTeacher ? 'Class Teacher' : 'Subject Teacher'),
            ]),
          ),
          const SizedBox(height: 20),
          PanelCard(
            title: 'Manage',
            icon: Icons.tune,
            padding: EdgeInsets.zero,
            child: Column(children: [
              _tile(Icons.fact_check_outlined, 'Take Attendance', AppColors.teal, () => scoped('/attendance')),
              const Divider(),
              _tile(Icons.edit_note_outlined, 'Enter Marks', AppColors.green, () => scoped('/gradebook')),
              const Divider(),
              _tile(Icons.assignment_outlined, 'Assignments', AppColors.tertiary, () => context.push('/assignments')),
              const Divider(),
              _tile(Icons.psychology_alt_outlined, 'Behaviour', AppColors.error, () => context.push('/behaviour')),
              const Divider(),
              _tile(Icons.chat_bubble_outline, 'Message Parents', AppColors.teal, () => context.push('/messages')),
              const Divider(),
              _tile(Icons.query_stats_outlined, 'Class Results', AppColors.tealDark, () => scoped('/gradebook')),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _tile(IconData icon, String label, Color color, VoidCallback onTap) => InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppTheme.radius)),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate700))),
            const Icon(Icons.chevron_right, color: AppColors.slate400),
          ]),
        ),
      );
}
