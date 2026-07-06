import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final student = auth.selected;
    final fees = ref.watch(feesProvider);
    final results = ref.watch(resultsProvider);
    final attendance = ref.watch(attendanceProvider);
    final anns = ref.watch(announcementsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('ShuleCloud Parent', style: TextStyle(fontSize: 20, color: AppColors.primary)),
        actions: [
          IconButton(onPressed: () => context.push('/notifications'), icon: const Icon(Icons.notifications_none)),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(feesProvider); ref.invalidate(resultsProvider);
          ref.invalidate(attendanceProvider); ref.invalidate(announcementsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Hello, ${auth.parent?.name ?? 'Parent'}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.onSurface)),
            const Text('Your children are safe at school today.', style: TextStyle(color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 12),

            // Child switcher
            if (auth.students.length > 1)
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    for (final s in auth.students)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(s.name.split(' ').first),
                          selected: s.id == student?.id,
                          selectedColor: AppColors.primary,
                          labelStyle: TextStyle(color: s.id == student?.id ? Colors.white : AppColors.onSurface),
                          onSelected: (_) => ref.read(authControllerProvider.notifier).selectStudent(s.id),
                        ),
                      ),
                  ],
                ),
              ),
            const SizedBox(height: 12),

            // Balance hero
            _balanceCard(context, fees.valueOrNull?.balance ?? student?.feeBalance ?? 0, fees.valueOrNull?.nextDueDate ?? ''),
            const SizedBox(height: 12),

            // Stat cards
            StatTile(label: 'Term Attendance', value: '${(attendance.valueOrNull?.monthPercent ?? student?.attendanceRate ?? 0).toStringAsFixed(1)}%',
                color: AppColors.secondary, icon: Icons.event_available),
            const SizedBox(height: 12),
            StatTile(label: 'Class Average', value: results.valueOrNull?.overallGrade ?? '—',
                color: AppColors.tertiary, icon: Icons.bar_chart),
            const SizedBox(height: 20),

            const SectionHeader('Quick Actions'),
            GridView.count(
              crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 2.6,
              children: [
                _action(context, Icons.payments, 'Pay Fees', AppColors.primary, '/academics/fees'),
                _action(context, Icons.directions_bus, 'Track Bus', AppColors.tertiary, '/bus'),
                _action(context, Icons.star_outline, 'Results', AppColors.secondary, '/academics'),
                _action(context, Icons.menu_book, 'Homework', AppColors.primary, '/academics/homework'),
                _action(context, Icons.event, 'Attendance', AppColors.secondary, '/academics/attendance'),
                _action(context, Icons.local_library, 'Library', AppColors.tertiary, '/academics/library'),
                _action(context, Icons.calendar_month, 'Calendar', AppColors.primary, '/academics/calendar'),
                _action(context, Icons.campaign, 'News', AppColors.secondary, '/academics/announcements'),
              ],
            ),
            const SizedBox(height: 20),

            const SectionHeader('Latest Announcements'),
            anns.when(
              loading: () => const SizedBox(height: 80, child: Center(child: CircularProgressIndicator())),
              error: (_, __) => const SizedBox.shrink(),
              data: (list) => Column(
                children: [
                  for (final a in list.take(3))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: AppCard(
                        accent: a.urgent ? AppColors.error : AppColors.secondary,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(a.category.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: a.urgent ? AppColors.error : AppColors.secondary)),
                            const SizedBox(height: 2),
                            Text(a.title, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.onSurface)),
                            if (a.body.isNotEmpty) Text(a.body, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13)),
                          ],
                        ),
                      ),
                    ),
                  if (list.isEmpty) const Text('No announcements yet.', style: TextStyle(color: AppColors.onSurfaceVariant)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _balanceCard(BuildContext context, double balance, String due) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF00551F)], begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Total Outstanding Balance', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text(ksh(balance), style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('NEXT DUE DATE', style: TextStyle(color: Colors.white54, fontSize: 10, fontWeight: FontWeight.w700)),
                  Text(due.isEmpty ? '—' : due, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                ])),
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.primary, minimumSize: const Size(120, 44)),
                  onPressed: () => context.push('/academics/fees'),
                  child: const Text('Pay Fees'),
                ),
              ],
            ),
          ],
        ),
      );

  Widget _action(BuildContext context, IconData icon, String label, Color color, String route) => Material(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => context.push(route),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.outlineVariant.withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.start,
              children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(color: color.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(10)),
                  child: Icon(icon, color: color, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.onSurface)),
                ),
              ],
            ),
          ),
        ),
      );
}
