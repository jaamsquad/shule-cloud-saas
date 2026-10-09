import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../models/models.dart';
import '../../providers/data_providers.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';
import '../dashboard/dashboard_screen.dart';

const _th = TextStyle(fontSize: 10.5, letterSpacing: 0.6, fontWeight: FontWeight.w900, color: AppColors.slate500);

Color _scoreColor(double pct) => pct >= 70 ? AppColors.green : (pct >= 50 ? AppColors.tertiary : AppColors.error);

// ── Exam results ─────────────────────────────────────────────────────────────
class ResultsScreen extends ConsumerStatefulWidget {
  const ResultsScreen({super.key});
  @override
  ConsumerState<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends ConsumerState<ResultsScreen> {
  String? _examId;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(examResultsProvider);
    return PortalPage(
      title: 'Exam Results',
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(examResultsProvider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(examResultsProvider)),
          data: (list) {
            if (list.isEmpty) return const ErrorView(message: 'No results published yet.', icon: Icons.workspace_premium_outlined);
            final exam = list.firstWhere((e) => e.examId == _examId, orElse: () => list.first);
            return ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: [
              if (list.length > 1) ...[
                FilterChipBar(items: [for (final e in list) e.examName], selected: exam.examName, onSelect: (n) {
                  setState(() => _examId = list.firstWhere((e) => e.examName == n).examId);
                }),
                const SizedBox(height: 14),
              ],
              Row(children: [
                Expanded(child: StatTile(label: 'Average', value: '${exam.average.toStringAsFixed(1)}%', color: _scoreColor(exam.average), icon: Icons.insights)),
                const SizedBox(width: 12),
                Expanded(
                  child: StatTile(
                    label: 'Total',
                    value: '${exam.totalMarks.toStringAsFixed(0)}/${exam.totalOutOf.toStringAsFixed(0)}',
                    color: AppColors.accent,
                    icon: Icons.functions,
                  ),
                ),
              ]),
              const SizedBox(height: 16),
              PanelCard(
                title: [exam.examName, exam.term, exam.academicYear].where((e) => e.isNotEmpty).join(' · '),
                icon: Icons.table_chart_outlined,
                padding: EdgeInsets.zero,
                child: Column(children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    color: AppColors.surfaceContainerLow,
                    child: const Row(children: [
                      Expanded(child: Text('SUBJECT', style: _th)),
                      SizedBox(width: 70, child: Text('MARKS', textAlign: TextAlign.right, style: _th)),
                      SizedBox(width: 56, child: Text('GRADE', textAlign: TextAlign.right, style: _th)),
                    ]),
                  ),
                  for (final (i, s) in exam.subjects.indexed) ...[
                    if (i > 0) const Divider(),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      child: Column(children: [
                        Row(children: [
                          Expanded(child: Text(s.name, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate800))),
                          SizedBox(
                            width: 70,
                            child: Text('${s.marks.toStringAsFixed(0)}/${s.outOf.toStringAsFixed(0)}',
                                textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate700)),
                          ),
                          SizedBox(
                            width: 56,
                            child: Text(s.grade.isEmpty ? '—' : s.grade,
                                textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.w900, color: _scoreColor(s.percent))),
                          ),
                        ]),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: (s.percent / 100).clamp(0, 1).toDouble(),
                            minHeight: 5,
                            color: _scoreColor(s.percent),
                            backgroundColor: AppColors.slate100,
                          ),
                        ),
                      ]),
                    ),
                  ],
                ]),
              ),
            ]);
          },
        ),
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
  static const _days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  late String _day = _days[(DateTime.now().weekday - 1).clamp(0, _days.length - 1)];

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(timetableProvider);
    return PortalPage(
      title: 'Timetable',
      subtitle: _day,
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(timetableProvider),
        child: ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: [
          FilterChipBar(items: _days, selected: _day, onSelect: (d) => setState(() => _day = d)),
          const SizedBox(height: 14),
          async.when(
            loading: () => const SkeletonList(),
            error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(timetableProvider)),
            data: (t) {
              if (t.timeSlots.isEmpty) return const ErrorView(message: 'No timetable published yet.', icon: Icons.schedule_outlined);
              final day = t.grid[_day] ?? const {};
              final count = t.timeSlots.where((s) => day[s] != null && !day[s]!.isEmpty).length;
              return PanelCard(
                title: '$_day · $count lesson${count == 1 ? '' : 's'}',
                icon: Icons.calendar_view_day_outlined,
                padding: EdgeInsets.zero,
                child: Column(children: [
                  for (final (i, slot) in t.timeSlots.indexed) ...[
                    if (i > 0) const Divider(),
                    _slot(slot, day[slot]),
                  ],
                ]),
              );
            },
          ),
        ]),
      ),
    );
  }

  Widget _slot(String slot, Lesson? l) {
    final free = l == null || l.isEmpty;
    return IntrinsicHeight(
      child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(
          width: 92,
          color: AppColors.surfaceContainerLow,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
          child: Text(slot, style: const TextStyle(color: AppColors.slate600, fontSize: 11.5, fontWeight: FontWeight.w800)),
        ),
        Container(width: 3, color: free ? Colors.transparent : AppColors.accent),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: free
                ? const Text('Free period', style: TextStyle(color: AppColors.slate400, fontStyle: FontStyle.italic, fontSize: 13))
                : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(l.subject, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate800)),
                    if (l.teacher.isNotEmpty || l.room.isNotEmpty)
                      Text([l.teacher, l.room].where((e) => e.isNotEmpty).join(' · '),
                          style: const TextStyle(color: AppColors.goldText, fontSize: 12.5, fontWeight: FontWeight.w600)),
                  ]),
          ),
        ),
      ]),
    );
  }
}

// ── Assignments & homework ───────────────────────────────────────────────────
class TasksScreen extends ConsumerStatefulWidget {
  /// 'assignment' | 'homework'
  final String type;
  final String title;
  const TasksScreen({super.key, required this.type, required this.title});
  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> {
  String _filter = 'To do';

  @override
  Widget build(BuildContext context) {
    final provider = tasksProvider(widget.type);
    final async = ref.watch(provider);
    return PortalPage(
      title: widget.title,
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(provider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(provider)),
          data: (all) {
            final todo = all.where((t) => !t.submitted).toList();
            final done = all.where((t) => t.submitted).toList();
            final list = _filter == 'To do' ? todo : done;
            return ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: [
              FilterChipBar(
                items: const ['To do', 'Submitted'],
                selected: _filter,
                onSelect: (f) => setState(() => _filter = f),
              ),
              const SizedBox(height: 14),
              if (list.isEmpty)
                ErrorView(
                  message: _filter == 'To do' ? 'Nothing due — you are all caught up!' : 'Nothing submitted yet.',
                  icon: _filter == 'To do' ? Icons.task_alt : Icons.inbox_outlined,
                )
              else
                for (final t in list)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _TaskCard(task: t, onTap: () => _open(t)),
                  ),
            ]);
          },
        ),
      ),
    );
  }

  Future<void> _open(TaskItem t) async {
    final submitted = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => TaskDetailScreen(type: widget.type, label: widget.title, task: t)),
    );
    if (submitted == true) ref.invalidate(tasksProvider(widget.type));
  }
}

class _TaskCard extends StatelessWidget {
  final TaskItem task;
  final VoidCallback onTap;
  const _TaskCard({required this.task, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final t = task;
    final (label, color) = t.submissionStatus.toLowerCase() == 'graded'
        ? ('Graded', AppColors.green)
        : t.submitted
            ? ('Submitted', AppColors.accent)
            : t.overdue
                ? ('Overdue', AppColors.error)
                : ('To do', AppColors.tertiary);
    return AppCard(
      accent: color,
      onTap: onTap,
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              if (t.subject.isNotEmpty) ...[
                Flexible(
                  child: Text(t.subject.toUpperCase(),
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 10.5, letterSpacing: 0.5, fontWeight: FontWeight.w900, color: AppColors.goldText)),
                ),
                const SizedBox(width: 8),
              ],
              StatusPill(label: label, color: color),
            ]),
            const SizedBox(height: 4),
            Text(t.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.slate800)),
            if (t.dueDate != null)
              Text('Due ${DateFormat('EEE d MMM, h:mm a').format(t.dueDate!.toLocal())}',
                  style: TextStyle(fontSize: 12.5, color: t.overdue ? AppColors.error : AppColors.slate500, fontWeight: FontWeight.w600)),
            if (t.marks != null)
              Text('Score: ${t.marks!.toStringAsFixed(0)}${t.totalMarks != null ? '/${t.totalMarks!.toStringAsFixed(0)}' : ''}',
                  style: const TextStyle(fontSize: 12.5, color: AppColors.green, fontWeight: FontWeight.w800)),
          ]),
        ),
        const Icon(Icons.chevron_right, color: AppColors.slate400),
      ]),
    );
  }
}

class TaskDetailScreen extends ConsumerStatefulWidget {
  final String type;
  final String label;
  final TaskItem task;
  const TaskDetailScreen({super.key, required this.type, required this.label, required this.task});
  @override
  ConsumerState<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends ConsumerState<TaskDetailScreen> {
  late final _answer = TextEditingController(text: widget.task.answer);
  bool _sending = false;

  @override
  void dispose() {
    _answer.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_answer.text.trim().isEmpty) {
      showToast(context, 'Write your answer first.', error: true);
      return;
    }
    setState(() => _sending = true);
    try {
      await ref.read(dataRepoProvider).submitTask(widget.type, widget.task.id, _answer.text.trim());
      if (!mounted) return;
      showToast(context, 'Submitted successfully.');
      Navigator.of(context).pop(true);
    } catch (_) {
      if (mounted) showToast(context, 'Could not submit. Try again.', error: true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.task;
    final graded = t.submissionStatus.toLowerCase() == 'graded';
    return PortalPage(
      title: t.title,
      subtitle: t.subject.isEmpty ? widget.label : t.subject,
      bottomBar: graded
          ? null
          : FilledButton.icon(
              onPressed: _sending ? null : _submit,
              icon: _sending
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.send_outlined, size: 18),
              label: Text(t.submitted ? 'Update Submission' : 'Submit'),
            ),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: [
        PanelCard(
          title: 'Instructions',
          icon: Icons.info_outline,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(t.description.isEmpty ? 'No instructions given.' : t.description,
                style: const TextStyle(color: AppColors.slate700, height: 1.5)),
            const SizedBox(height: 10),
            const Divider(),
            InfoField(label: 'Subject', value: t.subject),
            InfoField(label: 'Teacher', value: t.teacher),
            InfoField(label: 'Due', value: t.dueDate == null ? null : DateFormat('EEE d MMM y, h:mm a').format(t.dueDate!.toLocal())),
            if (t.totalMarks != null) InfoField(label: 'Max marks', value: t.totalMarks!.toStringAsFixed(0)),
          ]),
        ),
        const SizedBox(height: 16),
        if (graded)
          PanelCard(
            title: 'Your grade',
            icon: Icons.grade_outlined,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text(
                '${t.marks?.toStringAsFixed(0) ?? '—'}${t.totalMarks != null ? ' / ${t.totalMarks!.toStringAsFixed(0)}' : ''}',
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: AppColors.green),
              ),
              if (t.feedback.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(t.feedback, style: const TextStyle(color: AppColors.slate700, fontStyle: FontStyle.italic)),
              ],
              if (t.answer.isNotEmpty) ...[
                const Divider(height: 24),
                const FieldLabel('Your answer'),
                Text(t.answer, style: const TextStyle(color: AppColors.slate700)),
              ],
            ]),
          )
        else
          PanelCard(
            title: t.submitted ? 'Your submission' : 'Your answer',
            icon: Icons.edit_outlined,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              if (t.overdue) ...[
                const InfoBanner(text: 'The due date has passed — your teacher will see this as a late submission.', color: AppColors.error, icon: Icons.schedule),
                const SizedBox(height: 12),
              ],
              TextField(controller: _answer, maxLines: 10, minLines: 6, decoration: const InputDecoration(hintText: 'Type your answer here…')),
              const SizedBox(height: 8),
              const Text('To upload photos or files of your work, use the web Student Portal.',
                  style: TextStyle(fontSize: 12, color: AppColors.slate500)),
            ]),
          ),
      ]),
    );
  }
}

// ── Notes & resources ────────────────────────────────────────────────────────
class ResourcesScreen extends ConsumerStatefulWidget {
  const ResourcesScreen({super.key});
  @override
  ConsumerState<ResourcesScreen> createState() => _ResourcesScreenState();
}

class _ResourcesScreenState extends ConsumerState<ResourcesScreen> {
  String _q = '';

  IconData _icon(Resource r) {
    final t = '${r.type} ${r.fileName}'.toLowerCase();
    if (t.contains('video')) return Icons.play_circle_outline;
    if (t.contains('pdf')) return Icons.picture_as_pdf_outlined;
    if (t.contains('link') || r.url.isNotEmpty) return Icons.link;
    return Icons.description_outlined;
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(resourcesProvider);
    return PortalPage(
      title: 'Notes & Resources',
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(resourcesProvider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(resourcesProvider)),
          data: (all) {
            final list = _q.isEmpty
                ? all
                : all.where((r) => r.title.toLowerCase().contains(_q) || r.subject.toLowerCase().contains(_q)).toList();
            return ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: [
              TextField(
                decoration: const InputDecoration(hintText: 'Search notes or subjects…', prefixIcon: Icon(Icons.search)),
                onChanged: (v) => setState(() => _q = v.trim().toLowerCase()),
              ),
              const SizedBox(height: 14),
              if (list.isEmpty)
                const ErrorView(message: 'No notes shared with your class yet.', icon: Icons.menu_book_outlined)
              else
                for (final r in list)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: AppCard(
                      onTap: r.url.isNotEmpty ? () => launchUrl(Uri.parse(r.url), mode: LaunchMode.externalApplication) : null,
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(color: AppColors.accent.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppTheme.radiusLg)),
                          child: Icon(_icon(r), color: AppColors.accent, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(r.title, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate800)),
                            Text([r.type, r.subject].where((e) => e.isNotEmpty).join(' · ').toUpperCase(),
                                style: const TextStyle(fontSize: 10.5, letterSpacing: 0.4, fontWeight: FontWeight.w800, color: AppColors.goldText)),
                            if (r.description.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(r.description, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, color: AppColors.slate500)),
                              ),
                            if (r.url.isEmpty && r.hasFile)
                              const Padding(
                                padding: EdgeInsets.only(top: 4),
                                child: Text('File attached — open it on the web Student Portal.', style: TextStyle(fontSize: 11.5, color: AppColors.slate400)),
                              ),
                          ]),
                        ),
                        if (r.url.isNotEmpty) const Icon(Icons.open_in_new, size: 18, color: AppColors.slate400),
                      ]),
                    ),
                  ),
            ]);
          },
        ),
      ),
    );
  }
}

// ── School calendar ──────────────────────────────────────────────────────────
class CalendarScreen extends ConsumerWidget {
  const CalendarScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(calendarProvider);
    return PortalPage(
      title: 'School Calendar',
      subtitle: async.valueOrNull?.termName,
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(calendarProvider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(calendarProvider)),
          data: (c) => c.activities.isEmpty
              ? const ErrorView(message: 'No dates set for this term yet.', icon: Icons.event_note_outlined)
              : ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: [
                  PanelCard(
                    title: c.termName.isEmpty ? 'This term' : c.termName,
                    icon: Icons.calendar_month_outlined,
                    padding: EdgeInsets.zero,
                    child: Column(children: [
                      for (final (i, a) in c.activities.indexed) ...[
                        if (i > 0) const Divider(),
                        CalendarRow(activity: a),
                      ],
                    ]),
                  ),
                ]),
        ),
      ),
    );
  }
}
