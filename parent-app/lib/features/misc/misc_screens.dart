import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../models/homework.dart';
import '../../models/misc_models.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_providers.dart';
import '../../providers/settings_provider.dart';
import '../../widgets/app_widgets.dart';

// ── Homework ─────────────────────────────────────────────────────────────────
class HomeworkScreen extends ConsumerWidget {
  const HomeworkScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(homeworkProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Homework')),
      body: async.when(
        loading: () => const SkeletonList(),
        error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(homeworkProvider)),
        data: (list) => list.isEmpty
            ? const ErrorView(message: 'No homework right now. 🎉', icon: Icons.check_circle_outline)
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, i) => _hwCard(list[i]),
              ),
      ),
    );
  }

  Widget _hwCard(Homework h) {
    final (label, color) = switch (h.status) {
      TaskStatus.submitted => ('Submitted', AppColors.primary),
      TaskStatus.graded => ('Graded', AppColors.secondary),
      TaskStatus.overdue => ('Overdue', AppColors.error),
      TaskStatus.pending => ('Pending', AppColors.tertiary),
    };
    return AppCard(
      accent: color,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: AppColors.surfaceContainer, borderRadius: BorderRadius.circular(6)),
              child: Text(h.subject.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700))),
            const Spacer(),
            Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12)),
          ]),
          const SizedBox(height: 6),
          Text(h.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          if (h.description.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4),
            child: Text(h.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.onSurfaceVariant))),
          const SizedBox(height: 8),
          Row(children: [
            const Icon(Icons.person_outline, size: 16, color: AppColors.onSurfaceVariant), const SizedBox(width: 4),
            Text(h.teacher, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
            const Spacer(),
            if (h.dueDate.isNotEmpty) Text('Due ${h.dueDate}', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
          ]),
        ],
      ),
    );
  }
}

// ── Timetable ────────────────────────────────────────────────────────────────
class TimetableScreen extends ConsumerStatefulWidget {
  const TimetableScreen({super.key});
  @override
  ConsumerState<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends ConsumerState<TimetableScreen> {
  static const _days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  String _day = 'Monday';
  final _colors = [AppColors.primary, AppColors.secondary, AppColors.tertiary];

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(timetableProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Timetable')),
      body: Column(
        children: [
          Padding(padding: const EdgeInsets.all(16),
            child: FilterChipBar(items: _days, selected: _day, onSelect: (d) => setState(() => _day = d))),
          Expanded(child: async.when(
            loading: () => const SkeletonList(),
            error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(timetableProvider)),
            data: (all) {
              final lessons = all.where((l) => l.day.toLowerCase() == _day.toLowerCase()).toList();
              if (lessons.isEmpty) return const ErrorView(message: 'No lessons for this day.', icon: Icons.free_breakfast_outlined);
              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: lessons.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, i) {
                  final l = lessons[i];
                  if (l.isBreak) return Center(child: Text('${l.subject} (${l.start} - ${l.end})', style: const TextStyle(color: AppColors.onSurfaceVariant, fontStyle: FontStyle.italic)));
                  final c = _colors[i % _colors.length];
                  return AppCard(accent: c, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(child: Text(l.subject, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
                      Text('${l.start} - ${l.end}', style: const TextStyle(color: AppColors.onSurfaceVariant)),
                    ]),
                    const SizedBox(height: 6),
                    Row(children: [
                      const Icon(Icons.person_outline, size: 16, color: AppColors.onSurfaceVariant), const SizedBox(width: 4),
                      Text(l.teacher, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13)),
                      const SizedBox(width: 16),
                      const Icon(Icons.meeting_room_outlined, size: 16, color: AppColors.onSurfaceVariant), const SizedBox(width: 4),
                      Text(l.room, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13)),
                    ]),
                  ]));
                },
              );
            },
          )),
        ],
      ),
    );
  }
}

// ── Fees ─────────────────────────────────────────────────────────────────────
class FeesScreen extends ConsumerWidget {
  const FeesScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(feesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Fees')),
      body: async.when(
        loading: () => const SkeletonList(),
        error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(feesProvider)),
        data: (f) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF00551F)]), borderRadius: BorderRadius.circular(20)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Current Balance', style: TextStyle(color: Colors.white70)),
                Text(ksh(f.balance), style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800)),
                const Divider(color: Colors.white24, height: 24),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Paid', style: TextStyle(color: Colors.white54, fontSize: 12)), Text(ksh(f.paid), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700))]),
                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [const Text('Outstanding', style: TextStyle(color: Colors.white54, fontSize: 12)), Text(ksh(f.balance), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700))]),
                ]),
              ]),
            ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: FilledButton.icon(onPressed: () => _payDialog(context), icon: const Icon(Icons.phone_android), label: const Text('Pay via M-PESA'))),
              const SizedBox(width: 12),
              Expanded(child: OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.description), label: const Text('Statement'))),
            ]),
            const SizedBox(height: 16),
            const SectionHeader('Payment History'),
            for (final p in f.history)
              AppCard(accent: p.status.toUpperCase() == 'CLEARED' ? AppColors.primary : AppColors.secondary, child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(p.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text('${p.date}${p.method.isNotEmpty ? ' · ${p.method}' : ''}', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                ])),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text('+${ksh(p.amount)}', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800)),
                  Text(p.status, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10)),
                ]),
              ])),
            if (f.breakdown.isNotEmpty) ...[
              const SizedBox(height: 8),
              const SectionHeader('Breakdown'),
              AppCard(child: Column(children: [
                for (final b in f.breakdown)
                  Padding(padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(b.label), Text(ksh(b.amount), style: const TextStyle(fontWeight: FontWeight.w700))])),
                const Divider(),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Total Invoiced', style: TextStyle(fontWeight: FontWeight.w700)), Text(ksh(f.totalInvoiced), style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800))]),
              ])),
            ],
          ],
        ),
      ),
    );
  }

  void _payDialog(BuildContext context) => showDialog(context: context, builder: (_) => AlertDialog(
        title: const Text('Pay via M-PESA'),
        content: const Text('An STK push will be sent to your phone to authorise the payment.'),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Send prompt'))],
      ));
}

// ── Library ──────────────────────────────────────────────────────────────────
class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(libraryProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Library')),
      body: async.when(
        loading: () => const SkeletonList(),
        error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(libraryProvider)),
        data: (l) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(children: [
              Expanded(child: StatTile(label: 'Borrowed', value: '${l.borrowed}', color: AppColors.primary, icon: Icons.menu_book)),
              const SizedBox(width: 12),
              Expanded(child: StatTile(label: 'Due Soon', value: '${l.dueSoon}', color: AppColors.secondary, icon: Icons.hourglass_bottom)),
            ]),
            if (l.fines > 0) Padding(padding: const EdgeInsets.only(top: 12),
              child: AppCard(accent: AppColors.error, child: Row(children: [
                const Expanded(child: Text('Pending Fines', style: TextStyle(fontWeight: FontWeight.w700))),
                Text(ksh(l.fines), style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.w800)),
              ]))),
            const SizedBox(height: 16),
            const SectionHeader('Active Loans'),
            for (final b in l.loans)
              AppCard(accent: b.overdue ? AppColors.error : AppColors.primary, child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(b.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text('Due: ${b.dueDate}${b.overdue ? ' (overdue)' : ''}', style: TextStyle(color: b.overdue ? AppColors.error : AppColors.onSurfaceVariant, fontSize: 12)),
                ])),
                if (b.renewable && !b.overdue) FilledButton(onPressed: () {}, style: FilledButton.styleFrom(minimumSize: const Size(90, 36)), child: const Text('Renew')),
              ])),
            if (l.loans.isEmpty) const Padding(padding: EdgeInsets.all(16), child: Text('No active loans.', style: TextStyle(color: AppColors.onSurfaceVariant))),
          ],
        ),
      ),
    );
  }
}

// ── Messages ─────────────────────────────────────────────────────────────────
class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});
  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  String _filter = 'All';
  @override
  Widget build(BuildContext context) {
    final async = ref.watch(messagesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Messages'), actions: [
        IconButton(onPressed: () {}, icon: const Icon(Icons.search)),
        IconButton(onPressed: () {}, icon: const Icon(Icons.edit_square)),
      ]),
      body: Column(children: [
        Padding(padding: const EdgeInsets.all(16),
          child: FilterChipBar(items: const ['All','Teachers','Admin','Transport'], selected: _filter, onSelect: (f) => setState(() => _filter = f))),
        Expanded(child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(messagesProvider)),
          data: (list) {
            final f = _filter == 'All' ? list : list.where((m) => m.category == _filter).toList();
            if (f.isEmpty) return const ErrorView(message: 'No messages yet.', icon: Icons.forum_outlined);
            return ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: f.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _thread(f[i]),
            );
          },
        )),
      ]),
    );
  }

  Widget _thread(MessageThread m) => AppCard(
        accent: m.unread ? AppColors.primary : null,
        child: Row(children: [
          CircleAvatar(radius: 22, backgroundColor: AppColors.surfaceContainer,
              backgroundImage: m.avatarUrl != null ? CachedNetworkImageProvider(m.avatarUrl!) : null,
              child: m.avatarUrl == null ? const Icon(Icons.person, color: AppColors.primary) : null),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [Expanded(child: Text(m.sender, style: const TextStyle(fontWeight: FontWeight.w700))), Text(m.time, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 11))]),
            Text(m.preview, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.onSurfaceVariant)),
          ])),
          if (m.unread) Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle)),
        ]),
      );
}

// ── Announcements ────────────────────────────────────────────────────────────
class AnnouncementsScreen extends ConsumerStatefulWidget {
  const AnnouncementsScreen({super.key});
  @override
  ConsumerState<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends ConsumerState<AnnouncementsScreen> {
  String _filter = 'All';
  @override
  Widget build(BuildContext context) {
    final async = ref.watch(announcementsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Announcements')),
      body: Column(children: [
        Padding(padding: const EdgeInsets.all(16),
          child: FilterChipBar(items: const ['All','Academic','Transport','Events','Emergency'], selected: _filter, onSelect: (f) => setState(() => _filter = f))),
        Expanded(child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(announcementsProvider)),
          data: (list) {
            final f = _filter == 'All' ? list : list.where((a) => a.category.toLowerCase() == _filter.toLowerCase()).toList();
            if (f.isEmpty) return const ErrorView(message: 'No announcements.', icon: Icons.campaign_outlined);
            return ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: f.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, i) {
                final a = f[i];
                return AppCard(accent: a.urgent ? AppColors.error : AppColors.secondary, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    if (a.urgent) const Icon(Icons.priority_high, color: AppColors.error, size: 16),
                    Text(a.category.toUpperCase(), style: TextStyle(color: a.urgent ? AppColors.error : AppColors.secondary, fontSize: 11, fontWeight: FontWeight.w700)),
                    const Spacer(),
                    Text(a.time, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 11)),
                  ]),
                  const SizedBox(height: 4),
                  Text(a.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                  if (a.body.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Text(a.body, style: const TextStyle(color: AppColors.onSurfaceVariant))),
                ]));
              },
            );
          },
        )),
      ]),
    );
  }
}

// ── Calendar ─────────────────────────────────────────────────────────────────
class CalendarScreen extends ConsumerWidget {
  const CalendarScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(calendarProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('School Calendar')),
      body: async.when(
        loading: () => const SkeletonList(),
        error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(calendarProvider)),
        data: (events) {
          if (events.isEmpty) return const ErrorView(message: 'No events scheduled.', icon: Icons.event_note_outlined);
          Color c(String cat) => switch (cat.toLowerCase()) {
                'holiday' => AppColors.primary, 'exam' => AppColors.secondary,
                'sports' => AppColors.tertiary, _ => AppColors.outline,
              };
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: events.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, i) {
              final e = events[i];
              return AppCard(accent: c(e.category), child: Row(children: [
                Column(children: [
                  Text(const ['','JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][e.date.month], style: TextStyle(color: c(e.category), fontSize: 11, fontWeight: FontWeight.w700)),
                  Text('${e.date.day}', style: TextStyle(color: c(e.category), fontSize: 22, fontWeight: FontWeight.w800)),
                ]),
                const SizedBox(width: 16),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(e.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                  if (e.detail.isNotEmpty) Text(e.detail, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                ])),
              ]));
            },
          );
        },
      ),
    );
  }
}

// ── Notifications ────────────────────────────────────────────────────────────
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Reuse announcements as the notification feed (grouped visually).
    final async = ref.watch(announcementsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: async.when(
        loading: () => const SkeletonList(),
        error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(announcementsProvider)),
        data: (list) => list.isEmpty
            ? const ErrorView(message: "You're all caught up.", icon: Icons.notifications_none)
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) => AppCard(child: Row(children: [
                  const Icon(Icons.notifications, color: AppColors.primary), const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(list[i].title, style: const TextStyle(fontWeight: FontWeight.w700)),
                    Text(list[i].body, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13)),
                  ])),
                ])),
              ),
      ),
    );
  }
}

// ── Profile ──────────────────────────────────────────────────────────────────
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(selectedStudentProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Student Profile'), actions: [
        IconButton(onPressed: () => context.push('/settings'), icon: const Icon(Icons.settings)),
      ]),
      body: s == null
          ? const ErrorView(message: 'No student selected.', icon: Icons.person_off)
          : ListView(padding: const EdgeInsets.all(16), children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF00551F)]), borderRadius: BorderRadius.circular(20)),
                child: Column(children: [
                  CircleAvatar(radius: 44, backgroundColor: Colors.white,
                      backgroundImage: s.photoUrl != null ? CachedNetworkImageProvider(s.photoUrl!) : null,
                      child: s.photoUrl == null ? const Icon(Icons.person, size: 44, color: AppColors.primary) : null),
                  const SizedBox(height: 12),
                  Text(s.name, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                  Text('${s.className}${s.stream.isNotEmpty ? ' ${s.stream}' : ''}', style: const TextStyle(color: Colors.white70)),
                  const SizedBox(height: 4),
                  Text('Adm: ${s.admissionNo}', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                ]),
              ),
              const SizedBox(height: 16),
              _row(Icons.account_balance_wallet, 'Fee Balance', s.feeBalance <= 0 ? 'Cleared' : ksh(s.feeBalance)),
              _row(Icons.event_available, 'Attendance', '${s.attendanceRate.toStringAsFixed(1)}%'),
              if (s.house != null) _row(Icons.home_work, 'House', s.house!),
              _row(Icons.verified_user, 'Status', s.status),
              const SizedBox(height: 12),
              OutlinedButton.icon(onPressed: () => context.push('/settings'), icon: const Icon(Icons.settings), label: const Text('Settings')),
            ]),
    );
  }

  Widget _row(IconData i, String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: AppCard(child: Row(children: [
          Icon(i, color: AppColors.primary), const SizedBox(width: 12),
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
          Text(value, style: const TextStyle(color: AppColors.onSurfaceVariant, fontWeight: FontWeight.w700)),
        ])),
      );
}

// ── Settings ─────────────────────────────────────────────────────────────────
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(settingsControllerProvider);
    final sc = ref.read(settingsControllerProvider.notifier);
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const SectionHeader('Preferences'),
        AppCard(padding: EdgeInsets.zero, child: Column(children: [
          SwitchListTile(secondary: const Icon(Icons.dark_mode_outlined), title: const Text('Dark Mode'),
              value: s.themeMode == ThemeMode.dark, onChanged: sc.toggleDark),
          const Divider(height: 1),
          ListTile(leading: const Icon(Icons.language), title: const Text('Language'),
              subtitle: Text(s.language == 'sw' ? 'Kiswahili' : 'English (US)'), trailing: const Icon(Icons.chevron_right),
              onTap: () => _lang(context, sc, s.language)),
          const Divider(height: 1),
          SwitchListTile(secondary: const Icon(Icons.fingerprint), title: const Text('Biometric Login'),
              subtitle: const Text('Use FaceID or Fingerprint'), value: s.biometric, onChanged: sc.setBiometric),
        ])),
        const SizedBox(height: 16),
        const SectionHeader('Support'),
        AppCard(padding: EdgeInsets.zero, child: Column(children: [
          ListTile(leading: const Icon(Icons.help_outline), title: const Text('Help Center'), trailing: const Icon(Icons.open_in_new),
              onTap: () => launchUrl(Uri.parse('https://shulecloud.com'), mode: LaunchMode.externalApplication)),
          const Divider(height: 1),
          const ListTile(leading: Icon(Icons.privacy_tip_outlined), title: Text('Privacy')),
          const Divider(height: 1),
          const ListTile(leading: Icon(Icons.info_outline), title: Text('About'), subtitle: Text('ShuleCloud Parent v1.0.0')),
        ])),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(foregroundColor: AppColors.error, side: const BorderSide(color: AppColors.error)),
          onPressed: () async { await ref.read(authControllerProvider.notifier).logout(); if (context.mounted) context.go('/login'); },
          icon: const Icon(Icons.logout), label: const Text('Logout'),
        ),
        const SizedBox(height: 16),
        const Center(child: Text('ShuleCloud Parent v1.0.0 · Built for Excellence', style: TextStyle(color: AppColors.outline, fontSize: 12))),
      ]),
    );
  }

  void _lang(BuildContext context, SettingsController sc, String cur) => showModalBottomSheet(context: context, builder: (_) => Column(mainAxisSize: MainAxisSize.min, children: [
        for (final e in {'en': 'English', 'sw': 'Kiswahili'}.entries)
          RadioListTile<String>(value: e.key, groupValue: cur, title: Text(e.value), onChanged: (v) { if (v != null) sc.setLanguage(v); Navigator.pop(context); }),
      ]));
}
