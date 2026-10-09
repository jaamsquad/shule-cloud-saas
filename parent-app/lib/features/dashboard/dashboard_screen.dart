import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../models/parent.dart';
import '../../models/student.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';

/// "My Child" — mirrors the web ParentDashboard.tsx: stat cards and the
/// gold-strip "Student Basic information" panel, plus the fee balance card,
/// quick actions and latest announcements.
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
    final width = MediaQuery.sizeOf(context).width;
    final balance = fees.valueOrNull?.balance ?? student?.feeBalance ?? 0;

    return PortalPage(
      title: 'My Child',
      subtitle: 'Hello, ${auth.parent?.name.split(' ').first ?? 'Parent'}',
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(feesProvider);
          ref.invalidate(resultsProvider);
          ref.invalidate(attendanceProvider);
          ref.invalidate(announcementsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            ResponsiveGrid(
              columns: width >= 1100 ? 4 : 2,
              children: [
                StatTile(
                  label: 'Class',
                  value: student == null ? '—' : '${student.className}${student.stream.isNotEmpty ? ' ${student.stream}' : ''}',
                  color: AppColors.green,
                  icon: Icons.school_outlined,
                ),
                StatTile(
                  label: 'Fee Balance',
                  value: balance <= 0 ? 'Cleared' : ksh(balance),
                  color: balance <= 0 ? AppColors.green : AppColors.tertiary,
                  icon: Icons.credit_card,
                  onTap: () => context.go('/academics/fees'),
                ),
                StatTile(
                  label: 'Avg. Score',
                  value: results.valueOrNull?.overallGrade ?? '—',
                  color: AppColors.green,
                  icon: Icons.workspace_premium_outlined,
                  onTap: () => context.go('/academics'),
                ),
                StatTile(
                  label: 'Attendance',
                  value: '${(attendance.valueOrNull?.monthPercent ?? student?.attendanceRate ?? 0).toStringAsFixed(0)}%',
                  color: AppColors.accent,
                  icon: Icons.event_available_outlined,
                  onTap: () => context.go('/academics/attendance'),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (student != null) ...[
              StudentInfoPanel(student: student, parent: auth.parent),
              const SizedBox(height: 20),
            ],
            _BalanceCard(balance: balance, due: fees.valueOrNull?.nextDueDate ?? ''),
            const SizedBox(height: 20),
            PanelCard(
              title: 'Quick Actions',
              icon: Icons.bolt,
              padding: const EdgeInsets.all(12),
              child: ResponsiveGrid(
                columns: width >= 700 ? 4 : 3,
                spacing: 8,
                children: const [
                  QuickAction(Icons.payments_outlined, 'Pay Fees', AppColors.green, '/academics/fees'),
                  QuickAction(Icons.directions_bus_outlined, 'Track Bus', AppColors.tertiary, '/bus'),
                  QuickAction(Icons.workspace_premium_outlined, 'Results', AppColors.accent, '/academics'),
                  QuickAction(Icons.menu_book_outlined, 'Homework', AppColors.green, '/academics/homework'),
                  QuickAction(Icons.event_available_outlined, 'Attendance', AppColors.accent, '/academics/attendance'),
                  QuickAction(Icons.schedule_outlined, 'Timetable', AppColors.tertiary, '/academics/timetable'),
                  QuickAction(Icons.local_library_outlined, 'Library', AppColors.green, '/academics/library'),
                  QuickAction(Icons.calendar_month_outlined, 'Calendar', AppColors.accent, '/academics/calendar'),
                ],
              ),
            ),
            const SizedBox(height: 20),
            PanelCard(
              title: 'Latest Announcements',
              icon: Icons.campaign_outlined,
              action: StripButton(label: 'View All', onTap: () => context.go('/academics/announcements')),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: anns.when(
                loading: () => const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator()),
                error: (_, __) => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Text('Could not load announcements.', style: TextStyle(color: AppColors.slate500)),
                ),
                data: (list) => list.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Text('No announcements yet.', style: TextStyle(color: AppColors.slate500)),
                      )
                    : Column(children: [
                        for (final (i, a) in list.take(3).indexed) ...[
                          if (i > 0) const Divider(),
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Container(
                                width: 8,
                                height: 8,
                                margin: const EdgeInsets.only(top: 6, right: 10),
                                decoration: BoxDecoration(color: a.urgent ? AppColors.error : AppColors.gold, shape: BoxShape.circle),
                              ),
                              Expanded(
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(a.title, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate800)),
                                  if (a.body.isNotEmpty)
                                    Text(a.body,
                                        maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.slate500, fontSize: 13)),
                                ]),
                              ),
                              if (a.category.isNotEmpty) ...[
                                const SizedBox(width: 8),
                                StatusPill(label: a.category, color: a.urgent ? AppColors.error : AppColors.accent),
                              ],
                            ]),
                          ),
                        ],
                      ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Gold-strip "Student Basic information" panel (web ParentDashboard).
class StudentInfoPanel extends StatelessWidget {
  final Student student;
  final Parent? parent;
  const StudentInfoPanel({super.key, required this.student, this.parent});

  @override
  Widget build(BuildContext context) {
    final s = student;
    final left = [
      InfoField(label: 'Reg. No', value: s.admissionNo),
      InfoField(label: 'Name', value: s.name.toUpperCase()),
      InfoField(label: 'Class', value: '${s.className}${s.stream.isNotEmpty ? ' ${s.stream}' : ''}'),
      InfoField(label: 'House', value: s.house),
    ];
    final right = [
      InfoField(label: 'Status', value: s.status),
      InfoField(label: 'Parent / Guardian', value: parent?.name),
      InfoField(label: 'Contact', value: parent?.phone),
      InfoField(label: 'Email', value: parent?.email),
    ];
    return PanelCard(
      title: 'Student Basic information',
      child: LayoutBuilder(builder: (context, c) {
        final wide = c.maxWidth >= 640;
        final avatar = InitialsAvatar(name: s.name, photoUrl: s.photoUrl, radius: wide ? 56 : 44);
        Widget column(List<Widget> fields) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              for (final (i, f) in fields.indexed) ...[if (i > 0) const Divider(), f],
            ]);
        if (wide) {
          return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            avatar,
            const SizedBox(width: 24),
            Expanded(child: column(left)),
            const SizedBox(width: 32),
            Expanded(child: column(right)),
          ]);
        }
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Center(child: avatar),
          const SizedBox(height: 12),
          column([...left, ...right]),
        ]);
      }),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  final double balance;
  final String due;
  const _BalanceCard({required this.balance, required this.due});

  @override
  Widget build(BuildContext context) => Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [AppColors.accent, AppColors.accentDark]),
          borderRadius: BorderRadius.circular(AppTheme.radius),
        ),
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('OUTSTANDING BALANCE',
                  style: TextStyle(color: Colors.white70, fontSize: 10.5, letterSpacing: 0.8, fontWeight: FontWeight.w800)),
              const SizedBox(height: 2),
              Text(ksh(balance), style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              Text(due.isEmpty ? 'No due date set' : 'Next due: $due',
                  style: const TextStyle(color: AppColors.gold, fontSize: 12, fontWeight: FontWeight.w700)),
            ]),
          ),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppColors.accent,
              minimumSize: const Size(0, 40),
              padding: const EdgeInsets.symmetric(horizontal: 14),
            ),
            onPressed: () => context.go('/academics/fees'),
            icon: const Icon(Icons.phone_android, size: 18),
            label: const Text('Pay Fees'),
          ),
        ]),
      );
}
