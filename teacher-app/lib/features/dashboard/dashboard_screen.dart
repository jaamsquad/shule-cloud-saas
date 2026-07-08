import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';
import '../assistant/ai_assistant_sheet.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final staff = auth.staff;
    final summary = ref.watch(summaryProvider);
    final anns = ref.watch(announcementsProvider);
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good Morning' : (hour < 17 ? 'Good Afternoon' : 'Good Evening');

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(summaryProvider);
          ref.invalidate(announcementsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(children: [
              Expanded(child: Text('$greeting, ${staff?.name.split(' ').first ?? 'Teacher'}',
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.onSurface))),
              IconButton(onPressed: () => context.push('/alerts'), icon: const Icon(Icons.notifications_none)),
            ]),
            const Text('Ready for another day of inspiring minds?', style: TextStyle(color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 16),
            AppCard(child: Row(children: [
              CircleAvatar(radius: 30, backgroundColor: AppColors.surfaceContainer,
                  backgroundImage: staff?.photoUrl != null ? NetworkImage(staff!.photoUrl!) : null,
                  child: staff?.photoUrl == null ? const Icon(Icons.person, size: 30, color: AppColors.primary) : null),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(staff?.name ?? 'Teacher', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppColors.onSurface)),
                Text('ID: ${staff?.portalUsername ?? '—'}', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                const SizedBox(height: 4),
                StatusPill(label: staff?.designation ?? 'Teacher', color: AppColors.secondary),
              ])),
            ])),
            const SizedBox(height: 20),
            SectionHeader('Daily Pulse', action: TextButton(onPressed: () {}, child: const Text('View Reports'))),
            summary.when(
              loading: () => const SkeletonList(count: 2),
              error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(summaryProvider)),
              data: (s) => Column(children: [
                Row(children: [
                  Expanded(child: StatTile(label: 'Classes Today', value: '${s.lessonsPerWeek}', color: AppColors.primary, icon: Icons.calendar_today_outlined)),
                  const SizedBox(width: 12),
                  Expanded(child: StatTile(label: 'Present', value: '${s.studentsPresent}', color: AppColors.secondary, icon: Icons.groups_outlined)),
                ]),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(child: StatTile(label: 'Pending HW', value: '${s.pendingAssignments}', color: AppColors.tertiary, icon: Icons.assignment_outlined)),
                  const SizedBox(width: 12),
                  Expanded(child: StatTile(label: 'Avg. Performance', value: '${s.averagePerformance.toStringAsFixed(0)}%', color: AppColors.primaryContainer, icon: Icons.trending_up)),
                ]),
              ]),
            ),
            const SizedBox(height: 20),
            const SectionHeader('Quick Actions'),
            _AiBanner(onTap: () => showAiAssistantSheet(context)),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.5,
              children: [
                _action(context, Icons.checklist_rtl, 'Take Attendance', AppColors.primary, '/attendance'),
                _action(context, Icons.school_outlined, 'My Classes', AppColors.secondary, '/classes'),
                _action(context, Icons.schedule_outlined, 'Timetable', AppColors.tertiary, '/timetable'),
                _action(context, Icons.grid_on_outlined, 'Gradebook', AppColors.primaryContainer, '/gradebook'),
                _action(context, Icons.menu_book_outlined, 'Homework', AppColors.secondary, '/assignments/homework'),
                _action(context, Icons.assignment_turned_in_outlined, 'Assignments', AppColors.primary, '/assignments'),
                _action(context, Icons.chat_bubble_outline, 'Messages', AppColors.tertiary, '/messages'),
                _action(context, Icons.psychology_alt_outlined, 'Behaviour', AppColors.error, '/behaviour'),
                _action(context, Icons.local_library_outlined, 'Library', AppColors.secondary, '/library'),
                _action(context, Icons.event_available_outlined, 'Leave', AppColors.primary, '/leave'),
              ],
            ),
            const SizedBox(height: 20),
            SectionHeader('Announcements', action: TextButton(onPressed: () => context.push('/alerts'), child: const Text('View All'))),
            anns.when(
              loading: () => const SkeletonList(count: 2),
              error: (_, __) => const SizedBox.shrink(),
              data: (list) => Column(children: [
                for (final a in list.take(3))
                  Padding(padding: const EdgeInsets.only(bottom: 10), child: AppCard(accent: AppColors.secondary, child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(a.title, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.onSurface)),
                      if (a.body.isNotEmpty) Text(a.body, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13)),
                    ],
                  ))),
                if (list.isEmpty) const Text('No announcements yet.', style: TextStyle(color: AppColors.onSurfaceVariant)),
              ]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _action(BuildContext context, IconData icon, String label, Color color, String route) => Material(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => context.push(route),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.outlineVariant.withValues(alpha: 0.4))),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(width: 40, height: 40, decoration: BoxDecoration(color: color.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(12)),
                  child: Icon(icon, color: color, size: 20)),
              const SizedBox(height: 8),
              Text(label, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.onSurface)),
            ]),
          ),
        ),
      );
}

class _AiBanner extends StatelessWidget {
  final VoidCallback onTap;
  const _AiBanner({required this.onTap});
  @override
  Widget build(BuildContext context) => Material(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Container(width: 40, height: 40, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.auto_awesome, color: Colors.white, size: 20)),
              const SizedBox(width: 12),
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('AI Teaching Assistant', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
                Text('Generate lesson plans or grade feedback instantly.', style: TextStyle(color: Colors.white70, fontSize: 12)),
              ])),
              const Icon(Icons.chevron_right, color: Colors.white),
            ]),
          ),
        ),
      );
}
