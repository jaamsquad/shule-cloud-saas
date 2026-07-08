import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../models/staff.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';

/// Tabs: Students, Attendance, Assignments, Gradebook, Timetable, Behaviour.
/// Each tab deep-links into the already-built feature screen, pre-scoped to
/// this class/subject — avoids duplicating logic per tab.
class ClassDetailScreen extends ConsumerWidget {
  final ClassAssignment classAssignment;
  const ClassDetailScreen({super.key, required this.classAssignment});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = classAssignment;
    return Scaffold(
      appBar: AppBar(title: Text(c.className)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          AppCard(accent: AppColors.primary, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(c.className, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.onSurface)),
            if (c.subject.isNotEmpty) Text(c.subject, style: const TextStyle(color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 4),
            Text('${c.studentCount} students', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13)),
          ])),
          const SizedBox(height: 16),
          const SectionHeader('Manage'),
          _tile(context, ref, Icons.checklist_rtl, 'Take Attendance', () {
            ref.read(selectedClassSubjectProvider.notifier).state = ClassSubjectSelection(className: c.className, subject: c.subject);
            context.push('/attendance');
          }),
          _tile(context, ref, Icons.grid_on_outlined, 'Enter Marks', () {
            ref.read(selectedClassSubjectProvider.notifier).state = ClassSubjectSelection(className: c.className, subject: c.subject);
            context.push('/gradebook');
          }),
          _tile(context, ref, Icons.assignment_outlined, 'Assignments', () => context.push('/assignments')),
          _tile(context, ref, Icons.psychology_alt_outlined, 'Behaviour', () => context.push('/behaviour')),
          _tile(context, ref, Icons.chat_bubble_outline, 'Message Parents', () => context.push('/messages')),
          _tile(context, ref, Icons.query_stats_outlined, 'Class Results', () => context.push('/gradebook')),
        ],
      ),
    );
  }

  Widget _tile(BuildContext context, WidgetRef ref, IconData icon, String label, VoidCallback onTap) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: AppCard(onTap: onTap, child: Row(children: [
          Icon(icon, color: AppColors.primary), const SizedBox(width: 12),
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.onSurface))),
          const Icon(Icons.chevron_right, color: AppColors.outline),
        ])),
      );
}
