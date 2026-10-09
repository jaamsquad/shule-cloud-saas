import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../models/content_item.dart';
import '../../providers/data_providers.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';

/// Generic list screen reused for Assignments, Homework, Lesson Plans, Schemes
/// — each is a `type` string mapped to a backend collection via /content/:type.
class ContentListScreen extends ConsumerWidget {
  final String type;
  final String title;
  const ContentListScreen({super.key, required this.type, required this.title});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = _providerFor(type);
    final async = ref.watch(provider);
    return PortalPage(
      title: title,
      subtitle: async.valueOrNull == null ? null : '${async.valueOrNull!.length} item${async.valueOrNull!.length == 1 ? '' : 's'}',
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: FilledButton.icon(
            style: FilledButton.styleFrom(minimumSize: const Size(0, 38), padding: const EdgeInsets.symmetric(horizontal: 14)),
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ContentEditorScreen(type: type, title: title))),
            icon: const Icon(Icons.add, size: 18),
            label: const Text('New'),
          ),
        ),
      ],
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(provider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(provider)),
          data: (list) => list.isEmpty
              ? ErrorView(message: 'No $title yet. Tap New to create one.', icon: Icons.assignment_outlined)
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final item = list[i];
                    final overdue = item.dueDate != null && item.dueDate!.isBefore(DateTime.now());
                    return AppCard(
                      accent: overdue ? AppColors.error : AppColors.teal,
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => SubmissionsScreen(type: type, item: item))),
                      child: Row(children: [
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(item.title, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate800)),
                            if (item.className.isNotEmpty || item.subject.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text('${item.className}${item.subject.isNotEmpty ? ' · ${item.subject}' : ''}',
                                  style: const TextStyle(color: AppColors.goldText, fontSize: 12.5, fontWeight: FontWeight.w600)),
                            ],
                            if (item.dueDate != null) ...[
                              const SizedBox(height: 6),
                              StatusPill(
                                label: '${overdue ? 'Closed' : 'Due'} ${DateFormat('MMM d, y').format(item.dueDate!)}',
                                color: overdue ? AppColors.error : AppColors.tertiary,
                              ),
                            ],
                          ]),
                        ),
                        const Icon(Icons.chevron_right, color: AppColors.slate400),
                      ]),
                    );
                  },
                ),
        ),
      ),
    );
  }
}

AutoDisposeFutureProvider<List<ContentItem>> _providerFor(String type) => switch (type) {
      'homework' => homeworkProvider,
      'lesson-plans' => lessonPlansProvider,
      'schemes' => schemesProvider,
      'resources' => resourcesProvider,
      _ => assignmentsProvider,
    };

/// Create/edit form — matches the "New Assignment" Stitch design: title,
/// description, due date, max points, attachments (link only in this pass).
class ContentEditorScreen extends ConsumerStatefulWidget {
  final String type;
  final String title;
  final ContentItem? existing;
  const ContentEditorScreen({super.key, required this.type, required this.title, this.existing});

  @override
  ConsumerState<ContentEditorScreen> createState() => _ContentEditorScreenState();
}

class _ContentEditorScreenState extends ConsumerState<ContentEditorScreen> {
  late final _titleCtrl = TextEditingController(text: widget.existing?.title ?? '');
  late final _descCtrl = TextEditingController(text: widget.existing?.description ?? '');
  late final _classCtrl = TextEditingController(text: widget.existing?.className ?? '');
  late final _subjectCtrl = TextEditingController(text: widget.existing?.subject ?? '');
  late final _pointsCtrl = TextEditingController(text: widget.existing?.totalMarks?.toStringAsFixed(0) ?? '');
  DateTime? _dueDate;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _dueDate = widget.existing?.dueDate;
  }

  @override
  void dispose() {
    _titleCtrl.dispose(); _descCtrl.dispose(); _classCtrl.dispose(); _subjectCtrl.dispose(); _pointsCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PortalPage(
      title: widget.existing == null ? 'New ${widget.title}' : 'Edit ${widget.title}',
      bottomBar: Row(children: [
        Expanded(child: OutlinedButton(onPressed: () => Navigator.of(context).maybePop(), child: const Text('Cancel'))),
        const SizedBox(width: 12),
        Expanded(
          child: FilledButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(widget.existing == null ? 'Create' : 'Save'),
          ),
        ),
      ]),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          PanelCard(
            title: '${widget.title} details',
            icon: Icons.edit_document,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const FieldLabel('Title'),
              TextField(controller: _titleCtrl, decoration: InputDecoration(hintText: '${widget.title} title')),
              const SizedBox(height: 14),
              const FieldLabel('Description & Instructions'),
              TextField(controller: _descCtrl, maxLines: 5, decoration: const InputDecoration(hintText: 'What should students do?')),
              const SizedBox(height: 14),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    const FieldLabel('Class'),
                    TextField(controller: _classCtrl, decoration: const InputDecoration(hintText: 'e.g. Grade 7')),
                  ]),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    const FieldLabel('Subject'),
                    TextField(controller: _subjectCtrl, decoration: const InputDecoration(hintText: 'e.g. Maths')),
                  ]),
                ),
              ]),
              const SizedBox(height: 14),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    const FieldLabel('Due Date'),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final picked = await showDatePicker(
                            context: context,
                            initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 7)),
                            firstDate: DateTime.now(),
                            lastDate: DateTime(2100));
                        if (picked != null) setState(() => _dueDate = picked);
                      },
                      icon: const Icon(Icons.calendar_today, size: 16),
                      label: Text(_dueDate == null ? 'Pick date' : DateFormat('MMM d, y').format(_dueDate!)),
                    ),
                  ]),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    const FieldLabel('Max Points'),
                    TextField(controller: _pointsCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: '100')),
                  ]),
                ),
              ]),
            ]),
          ),
          const SizedBox(height: 16),
          PanelCard(
            title: 'Attachments & Links',
            icon: Icons.attach_file,
            child: OutlinedButton.icon(onPressed: null, icon: const Icon(Icons.link), label: const Text('Add Link (coming soon)')),
          ),
          const SizedBox(height: 16),
          const InfoBanner(text: 'Clear instructions and rubrics help students achieve better outcomes.', icon: Icons.lightbulb_outline),
        ],
      ),
    );
  }

  Future<void> _save() async {
    if (_titleCtrl.text.trim().isEmpty) {
      showToast(context, 'Enter a title.', error: true);
      return;
    }
    setState(() => _saving = true);
    final body = {
      'title': _titleCtrl.text.trim(),
      'description': _descCtrl.text.trim(),
      'className': _classCtrl.text.trim(),
      'subject': _subjectCtrl.text.trim(),
      if (_dueDate != null) 'dueDate': _dueDate!.toIso8601String(),
      if (_pointsCtrl.text.trim().isNotEmpty) 'totalMarks': double.tryParse(_pointsCtrl.text.trim()),
    };
    try {
      if (widget.existing == null) {
        await ref.read(dataRepoProvider).createContent(widget.type, body);
      } else {
        await ref.read(dataRepoProvider).updateContent(widget.type, widget.existing!.id, body);
      }
      ref.invalidate(_providerFor(widget.type));
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        showToast(context, 'Could not save: $e', error: true);
        setState(() => _saving = false);
      }
    }
  }
}

// Keyed by (type, id) so the provider is stable across rebuilds (one created
// inside build() would be new every frame and refetch forever).
final _submissionsProvider = FutureProvider.autoDispose
    .family<List<Submission>, (String, String)>((ref, key) => ref.read(dataRepoProvider).submissions(key.$1, key.$2));

/// Submissions + grading for one assignment/homework item.
class SubmissionsScreen extends ConsumerWidget {
  final String type;
  final ContentItem item;
  const SubmissionsScreen({super.key, required this.type, required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subsProvider = _submissionsProvider((type, item.id));
    final async = ref.watch(subsProvider);
    return PortalPage(
      title: item.title,
      subtitle: 'Submissions',
      body: async.when(
        loading: () => const SkeletonList(),
        error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(subsProvider)),
        data: (list) => list.isEmpty
            ? const ErrorView(message: 'No submissions yet.', icon: Icons.inbox_outlined)
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                children: [
                  PanelCard(
                    title: '${list.length} submission${list.length == 1 ? '' : 's'} · ${list.where((s) => s.status == 'Graded').length} graded',
                    icon: Icons.inbox_outlined,
                    padding: EdgeInsets.zero,
                    child: Column(children: [
                      for (final (i, s) in list.indexed) ...[
                        if (i > 0) const Divider(),
                        InkWell(
                          onTap: () => _gradeDialog(context, ref, s.id, s.studentName),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            child: Row(children: [
                              InitialsAvatar(name: s.studentName, radius: 16),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(s.studentName, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate800)),
                                  const SizedBox(height: 3),
                                  StatusPill(label: s.status, color: s.status == 'Graded' ? AppColors.green : AppColors.tertiary),
                                ]),
                              ),
                              if (s.marks != null)
                                Text(s.marks!.toStringAsFixed(0), style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.teal, fontSize: 18))
                              else
                                const Text('Grade', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.teal, fontSize: 13)),
                              const Icon(Icons.chevron_right, color: AppColors.slate400),
                            ]),
                          ),
                        ),
                      ],
                    ]),
                  ),
                ],
              ),
      ),
    );
  }

  Future<void> _gradeDialog(BuildContext context, WidgetRef ref, String submissionId, String studentName) async {
    final marksCtrl = TextEditingController();
    final feedbackCtrl = TextEditingController();
    final ok = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: Text('Grade $studentName'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: marksCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Marks')),
        const SizedBox(height: 12),
        TextField(controller: feedbackCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Feedback')),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save Grade')),
      ],
    ));
    if (ok != true) return;
    final marks = double.tryParse(marksCtrl.text.trim());
    if (marks == null) return;
    try {
      await ref.read(dataRepoProvider).gradeSubmission(submissionId, marks: marks, feedback: feedbackCtrl.text.trim().isEmpty ? null : feedbackCtrl.text.trim());
      if (context.mounted) {
        showToast(context, 'Grade saved.');
        ref.invalidate(_submissionsProvider((type, item.id)));
      }
    } catch (_) {
      if (context.mounted) showToast(context, 'Could not save grade.', error: true);
    }
  }
}
