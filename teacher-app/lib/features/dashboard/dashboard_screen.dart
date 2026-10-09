import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../models/staff.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';
import '../assistant/ai_assistant_sheet.dart';

/// Mirrors the web StaffDashboard.tsx: stat cards, the gold-strip "Basic
/// information" panel, plus mobile quick actions and announcements.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final staff = ref.watch(authControllerProvider).staff;
    final summary = ref.watch(summaryProvider);
    final anns = ref.watch(announcementsProvider);
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good Morning' : (hour < 17 ? 'Good Afternoon' : 'Good Evening');
    final width = MediaQuery.sizeOf(context).width;

    return PortalPage(
      title: 'Dashboard',
      subtitle: '$greeting, ${staff?.name.split(' ').first ?? 'Teacher'}',
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(summaryProvider);
          ref.invalidate(announcementsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            summary.when(
              loading: () => const SkeletonList(count: 2),
              error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(summaryProvider)),
              data: (s) => _ResponsiveGrid(
                columns: width >= 1100 ? 3 : 2,
                children: [
                  StatTile(label: 'My Classes', value: '${s.classCount}', color: AppColors.green, icon: Icons.groups_outlined, onTap: () => context.go('/classes')),
                  StatTile(label: 'Subjects', value: '${s.subjectCount}', color: AppColors.green, icon: Icons.menu_book_outlined),
                  StatTile(label: 'Lessons / Wk', value: '${s.lessonsPerWeek}', color: AppColors.green, icon: Icons.schedule_outlined, onTap: () => context.go('/timetable')),
                  StatTile(label: 'Present', value: '${s.studentsPresent}', color: AppColors.teal, icon: Icons.how_to_reg_outlined, onTap: () => context.go('/attendance')),
                  StatTile(label: 'Pending Work', value: '${s.pendingAssignments}', color: AppColors.tertiary, icon: Icons.assignment_late_outlined, onTap: () => context.go('/assignments')),
                  StatTile(label: 'Avg. Score', value: '${s.averagePerformance.toStringAsFixed(0)}%', color: AppColors.teal, icon: Icons.trending_up),
                ],
              ),
            ),
            const SizedBox(height: 20),
            if (staff != null) ...[
              StaffInfoPanel(staff: staff),
              const SizedBox(height: 20),
            ],
            _AiBanner(onTap: () => showAiAssistantSheet(context)),
            const SizedBox(height: 20),
            PanelCard(
              title: 'Quick Actions',
              icon: Icons.bolt,
              padding: const EdgeInsets.all(12),
              child: _ResponsiveGrid(
                columns: width >= 700 ? 5 : 3,
                spacing: 8,
                children: [
                  _QuickAction(Icons.fact_check_outlined, 'Attendance', AppColors.teal, '/attendance'),
                  _QuickAction(Icons.groups_outlined, 'My Classes', AppColors.green, '/classes'),
                  _QuickAction(Icons.schedule_outlined, 'Timetable', AppColors.tertiary, '/timetable'),
                  _QuickAction(Icons.edit_note_outlined, 'Marks Entry', AppColors.tealDark, '/gradebook'),
                  _QuickAction(Icons.description_outlined, 'Homework', AppColors.green, '/assignments/homework'),
                  _QuickAction(Icons.assignment_outlined, 'Assignments', AppColors.teal, '/assignments'),
                  _QuickAction(Icons.chat_bubble_outline, 'Messages', AppColors.tertiary, '/messages'),
                  _QuickAction(Icons.psychology_alt_outlined, 'Behaviour', AppColors.error, '/behaviour'),
                  _QuickAction(Icons.local_library_outlined, 'Library', AppColors.green, '/library'),
                  _QuickAction(Icons.event_available_outlined, 'Leave', AppColors.teal, '/leave'),
                ],
              ),
            ),
            const SizedBox(height: 20),
            PanelCard(
              title: 'Announcements',
              icon: Icons.campaign_outlined,
              action: StripButton(label: 'View All', onTap: () => context.go('/alerts')),
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
                                decoration: const BoxDecoration(color: AppColors.gold, shape: BoxShape.circle),
                              ),
                              Expanded(
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(a.title, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate800)),
                                  if (a.body.isNotEmpty)
                                    Text(a.body,
                                        maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.slate500, fontSize: 13)),
                                ]),
                              ),
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

/// Gold-strip "Basic information" panel — same fields as the web dashboard,
/// with the same "Edit Contact" action (PATCH /staff-portal/profile).
class StaffInfoPanel extends ConsumerWidget {
  final Staff staff;
  const StaffInfoPanel({super.key, required this.staff});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final left = [
      InfoField(label: 'Staff No', value: staff.staffNo.isNotEmpty ? staff.staffNo : staff.portalUsername),
      InfoField(label: 'Name', value: staff.name.toUpperCase()),
      InfoField(label: 'Designation', value: staff.designation),
      InfoField(label: 'Department', value: staff.department),
    ];
    final right = [
      InfoField(label: 'Email', value: staff.email),
      InfoField(label: 'Phone', value: staff.phone),
      InfoField(label: 'Gender', value: staff.gender),
      InfoField(label: 'National ID', value: staff.nationalId),
    ];
    return PanelCard(
      title: 'Basic information',
      action: StripButton(label: 'Edit Contact', icon: Icons.edit_outlined, onTap: () => _editContact(context, ref)),
      child: LayoutBuilder(builder: (context, c) {
        final wide = c.maxWidth >= 640;
        final avatar = InitialsAvatar(name: staff.name, photoUrl: staff.photoUrl, radius: wide ? 56 : 44);
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

  Future<void> _editContact(BuildContext context, WidgetRef ref) async {
    final email = TextEditingController(text: staff.email);
    final phone = TextEditingController(text: staff.phone);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit Contact Details'),
        content: SizedBox(
          width: 360,
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const FieldLabel('Email'),
            TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(hintText: 'you@example.com')),
            const SizedBox(height: 12),
            const FieldLabel('Phone'),
            TextField(controller: phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(hintText: '07XXXXXXXX')),
          ]),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            style: TextButton.styleFrom(foregroundColor: AppColors.slate500),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.green, minimumSize: const Size(88, 40)),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(authControllerProvider.notifier).updateContact(email: email.text.trim(), phone: phone.text.trim());
      if (context.mounted) showToast(context, 'Contact details updated');
    } catch (_) {
      if (context.mounted) showToast(context, 'Update failed. Try again.', error: true);
    }
  }
}

class _ResponsiveGrid extends StatelessWidget {
  final int columns;
  final double spacing;
  final List<Widget> children;
  const _ResponsiveGrid({required this.columns, required this.children, this.spacing = 12});

  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, c) {
        final w = (c.maxWidth - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [for (final child in children) SizedBox(width: w, child: child)],
        );
      });
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final String route;
  const _QuickAction(this.icon, this.label, this.color, this.route);

  @override
  Widget build(BuildContext context) => Material(
        color: AppColors.surfaceContainerLow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radius),
          side: const BorderSide(color: AppColors.hairline),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppTheme.radius),
          onTap: () => context.push(route),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
            child: Column(children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppTheme.radiusLg)),
                child: Icon(icon, color: color, size: 19),
              ),
              const SizedBox(height: 8),
              Text(label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppColors.slate700)),
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
        borderRadius: BorderRadius.circular(AppTheme.radius),
        clipBehavior: Clip.antiAlias,
        child: Ink(
          decoration: const BoxDecoration(gradient: LinearGradient(colors: [AppColors.teal, AppColors.tealDark])),
          child: InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(AppTheme.radiusLg)),
                  child: const Icon(Icons.auto_awesome, color: AppColors.gold, size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('AI Teaching Assistant', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
                    Text('Generate lesson plans or grade feedback instantly.', style: TextStyle(color: Colors.white70, fontSize: 12)),
                  ]),
                ),
                const Icon(Icons.chevron_right, color: Colors.white),
              ]),
            ),
          ),
        ),
      );
}
