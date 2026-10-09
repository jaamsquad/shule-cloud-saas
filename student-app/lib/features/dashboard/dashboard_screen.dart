import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';

/// Student home — the web portal's stat cards and "Basic information" panel,
/// plus today's lessons, pending work and the term calendar.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final student = ref.watch(authControllerProvider).student;
    final summary = ref.watch(summaryProvider);
    final results = ref.watch(examResultsProvider);
    final timetable = ref.watch(timetableProvider);
    final assignments = ref.watch(tasksProvider('assignment'));
    final homework = ref.watch(tasksProvider('homework'));
    final calendar = ref.watch(calendarProvider);
    final width = MediaQuery.sizeOf(context).width;
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good Morning' : (hour < 17 ? 'Good Afternoon' : 'Good Evening');

    final s = summary.valueOrNull;
    final latest = (results.valueOrNull ?? const <ExamResult>[]).firstOrNull;
    final pending = [...?assignments.valueOrNull, ...?homework.valueOrNull].where((t) => !t.submitted).length;

    return PortalPage(
      title: 'Home',
      subtitle: '$greeting, ${student?.name.split(' ').first ?? 'Student'}',
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(summaryProvider);
          ref.invalidate(examResultsProvider);
          ref.invalidate(timetableProvider);
          ref.invalidate(tasksProvider);
          ref.invalidate(calendarProvider);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            ResponsiveGrid(
              columns: width >= 1100 ? 4 : 2,
              children: [
                StatTile(label: 'Class', value: student?.className.isNotEmpty == true ? student!.className : '—', color: AppColors.green, icon: Icons.school_outlined),
                StatTile(
                  label: 'Fee Balance',
                  value: s == null ? '—' : (s.balance <= 0 ? 'Cleared' : ksh(s.balance)),
                  color: (s?.balance ?? 0) <= 0 ? AppColors.green : AppColors.tertiary,
                  icon: Icons.credit_card,
                  onTap: () => context.go('/fees'),
                ),
                StatTile(
                  label: 'Last Exam',
                  value: latest == null ? '—' : '${latest.average.toStringAsFixed(1)}%',
                  color: AppColors.green,
                  icon: Icons.workspace_premium_outlined,
                  onTap: () => context.go('/results'),
                ),
                StatTile(
                  label: 'Pending Work',
                  value: '$pending',
                  color: pending > 0 ? AppColors.tertiary : AppColors.green,
                  icon: Icons.assignment_late_outlined,
                  onTap: () => context.go('/assignments'),
                ),
              ],
            ),
            if (s != null && s.currentTerm.isNotEmpty) ...[
              const SizedBox(height: 12),
              InfoBanner(
                text: '${s.currentTerm}: ${s.registered ? 'you are registered.' : 'you are not registered yet — register on the web portal.'}',
                color: s.registered ? AppColors.green : AppColors.tertiary,
                icon: s.registered ? Icons.verified_outlined : Icons.how_to_reg_outlined,
              ),
            ],
            const SizedBox(height: 20),
            PanelCard(
              title: "Today's lessons",
              icon: Icons.today_outlined,
              action: StripButton(label: 'Timetable', onTap: () => context.go('/timetable')),
              padding: EdgeInsets.zero,
              child: timetable.when(
                loading: () => const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator()),
                error: (_, __) => const _Muted('Could not load the timetable.'),
                data: (t) {
                  final day = DateFormat('EEEE').format(DateTime.now());
                  final lessons = [
                    for (final slot in t.timeSlots)
                      if (t.grid[day]?[slot] != null && !t.grid[day]![slot]!.isEmpty) (slot, t.grid[day]![slot]!),
                  ];
                  if (lessons.isEmpty) return const _Muted('No lessons today. Enjoy your day!');
                  return Column(children: [
                    for (final (i, (slot, l)) in lessons.indexed) ...[
                      if (i > 0) const Divider(),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        child: Row(children: [
                          SizedBox(width: 92, child: Text(slot, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: AppColors.slate500))),
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(l.subject, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate800)),
                              if (l.teacher.isNotEmpty || l.room.isNotEmpty)
                                Text([l.teacher, l.room].where((e) => e.isNotEmpty).join(' · '),
                                    style: const TextStyle(fontSize: 12.5, color: AppColors.goldText, fontWeight: FontWeight.w600)),
                            ]),
                          ),
                        ]),
                      ),
                    ],
                  ]);
                },
              ),
            ),
            const SizedBox(height: 20),
            if (student != null) ...[
              StudentInfoPanel(student: student),
              const SizedBox(height: 20),
            ],
            PanelCard(
              title: 'Quick Links',
              icon: Icons.bolt,
              padding: const EdgeInsets.all(12),
              child: ResponsiveGrid(
                columns: width >= 700 ? 4 : 3,
                spacing: 8,
                children: const [
                  QuickAction(Icons.workspace_premium_outlined, 'Results', AppColors.green, '/results'),
                  QuickAction(Icons.assignment_outlined, 'Assignments', AppColors.tertiary, '/assignments'),
                  QuickAction(Icons.description_outlined, 'Homework', AppColors.green, '/homework'),
                  QuickAction(Icons.menu_book_outlined, 'Notes', AppColors.accentDark, '/resources'),
                  QuickAction(Icons.payments_outlined, 'Pay Fees', AppColors.green, '/fees'),
                  QuickAction(Icons.account_balance_wallet_outlined, 'Wallet', AppColors.tertiary, '/wallet'),
                  QuickAction(Icons.receipt_long_outlined, 'Receipts', AppColors.accentDark, '/receipts'),
                  QuickAction(Icons.calendar_month_outlined, 'Calendar', AppColors.green, '/calendar'),
                ],
              ),
            ),
            const SizedBox(height: 20),
            calendar.maybeWhen(
              data: (c) {
                final today = DateTime.now();
                final upcoming = c.activities
                    .where((a) => a.date != null && !(a.endDate ?? a.date!).isBefore(DateTime(today.year, today.month, today.day)))
                    .take(3)
                    .toList();
                if (upcoming.isEmpty) return const SizedBox.shrink();
                return PanelCard(
                  title: 'Coming up${c.termName.isNotEmpty ? ' · ${c.termName}' : ''}',
                  icon: Icons.event_note_outlined,
                  action: StripButton(label: 'Calendar', onTap: () => context.go('/calendar')),
                  padding: EdgeInsets.zero,
                  child: Column(children: [
                    for (final (i, a) in upcoming.indexed) ...[
                      if (i > 0) const Divider(),
                      CalendarRow(activity: a),
                    ],
                  ]),
                );
              },
              orElse: () => const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}

class _Muted extends StatelessWidget {
  final String text;
  const _Muted(this.text);
  @override
  Widget build(BuildContext context) =>
      Padding(padding: const EdgeInsets.all(16), child: Text(text, style: const TextStyle(color: AppColors.slate500)));
}

/// One academic-calendar entry: date block + name + range.
class CalendarRow extends StatelessWidget {
  final CalendarActivity activity;
  const CalendarRow({super.key, required this.activity});

  static Color colorFor(String type) => switch (type) {
        'exam' => AppColors.error,
        'break' => AppColors.tertiary,
        'fee' => AppColors.goldText,
        'milestone' => AppColors.green,
        _ => AppColors.accentDark,
      };

  @override
  Widget build(BuildContext context) {
    final a = activity;
    final c = colorFor(a.type);
    final d = a.date;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(children: [
        Container(
          width: 46,
          padding: const EdgeInsets.symmetric(vertical: 4),
          decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppTheme.radius)),
          child: Column(children: [
            Text(d == null ? '—' : DateFormat('MMM').format(d).toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: c)),
            Text(d == null ? '' : '${d.day}', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: c)),
          ]),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(a.name, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate800)),
            if (d != null)
              Text(
                a.endDate != null && a.endDate != d
                    ? '${DateFormat('EEE d MMM').format(d)} – ${DateFormat('EEE d MMM').format(a.endDate!)}'
                    : DateFormat('EEEE, d MMMM').format(d),
                style: const TextStyle(fontSize: 12.5, color: AppColors.slate500),
              ),
          ]),
        ),
        if (a.type.isNotEmpty) StatusPill(label: a.type, color: c),
      ]),
    );
  }
}

/// Gold-strip "Basic information" panel (web PersonalProfile).
class StudentInfoPanel extends StatelessWidget {
  final Student student;
  const StudentInfoPanel({super.key, required this.student});

  String _date(String raw) {
    final d = DateTime.tryParse(raw);
    return d == null ? raw : DateFormat('d MMM y').format(d);
  }

  @override
  Widget build(BuildContext context) {
    final s = student;
    final left = [
      InfoField(label: 'Reg. No', value: s.registrationNo),
      InfoField(label: 'Name', value: s.name.toUpperCase()),
      InfoField(label: 'Class', value: [s.className, s.stream].where((e) => e.isNotEmpty).join(' ')),
      InfoField(label: 'Gender', value: s.gender),
    ];
    final right = [
      InfoField(label: 'Date of Birth', value: _date(s.dateOfBirth)),
      InfoField(label: 'Admission Date', value: _date(s.admissionDate)),
      InfoField(label: 'Parent / Guardian', value: s.parentName),
      InfoField(label: 'Contact', value: s.parentPhone),
    ];
    return PanelCard(
      title: 'Basic information',
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
