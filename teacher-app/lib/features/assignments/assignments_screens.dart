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
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ContentEditorScreen(type: type, title: title))),
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(provider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(provider)),
          data: (list) => list.isEmpty
              ? ErrorView(message: 'No $title yet. Tap + to create one.', icon: Icons.assignment_outlined)
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final item = list[i];
                    return AppCard(
                      accent: AppColors.primary,
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => SubmissionsScreen(type: type, item: item))),
                      child: Row(children: [
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(item.title, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.onSurface)),
                          if (item.className.isNotEmpty || item.subject.isNotEmpty)
                            Text('${item.className}${item.subject.isNotEmpty ? ' · ${item.subject}' : ''}', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                          if (item.dueDate != null)
                            Text('Due ${DateFormat('MMM d, y').format(item.dueDate!)}', style: const TextStyle(color: AppColors.tertiary, fontSize: 12, fontWeight: FontWeight.w600)),
                        ])),
                        const Icon(Icons.chevron_right, color: AppColors.outline),
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
    return Scaffold(
      appBar: AppBar(title: Text(widget.existing == null ? 'New ${widget.title}' : 'Edit ${widget.title}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: _titleCtrl, decoration: InputDecoration(labelText: 'Title', hintText: '${widget.title} Title')),
          const SizedBox(height: 12),
          TextField(controller: _descCtrl, maxLines: 5, decoration: const InputDecoration(labelText: 'Description & Instructions', alignLabelWithHint: true)),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: TextField(controller: _classCtrl, decoration: const InputDecoration(labelText: 'Class'))),
            const SizedBox(width: 12),
            Expanded(child: TextField(controller: _subjectCtrl, decoration: const InputDecoration(labelText: 'Subject'))),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: OutlinedButton.icon(
              onPressed: () async {
                final picked = await showDatePicker(context: context, initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 7)), firstDate: DateTime.now(), lastDate: DateTime(2100));
                if (picked != null) setState(() => _dueDate = picked);
              },
              icon: const Icon(Icons.calendar_today, size: 16),
              label: Text(_dueDate == null ? 'Due Date' : DateFormat('MMM d, y').format(_dueDate!)),
            )),
            const SizedBox(width: 12),
            Expanded(child: TextField(controller: _pointsCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Max Points'))),
          ]),
          const SizedBox(height: 20),
          const SectionHeader('Attachments & Links'),
          OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.link), label: const Text('Add Link (coming soon)')),
          const SizedBox(height: 24),
          AppCard(accent: AppColors.primaryContainer, child: Row(children: [
            const Icon(Icons.info_outline, color: AppColors.primaryContainer),
            const SizedBox(width: 10),
            const Expanded(child: Text('Clear instructions and rubrics help students achieve better outcomes.', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13))),
          ])),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(child: OutlinedButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel'))),
            const SizedBox(width: 12),
            Expanded(child: FilledButton(
              onPressed: _saving ? null : _save,
              child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(widget.existing == null ? 'Create' : 'Save'),
            )),
          ]),
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (_titleCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a title.'), backgroundColor: AppColors.error));
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
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not save: ${e.toString()}'), backgroundColor: AppColors.error));
        setState(() => _saving = false);
      }
    }
  }
}

/// Submissions + grading for one assignment/homework item.
class SubmissionsScreen extends ConsumerWidget {
  final String type;
  final ContentItem item;
  const SubmissionsScreen({super.key, required this.type, required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subsProvider = FutureProvider.autoDispose((ref) => ref.read(dataRepoProvider).submissions(type, item.id));
    final async = ref.watch(subsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(item.title)),
      body: async.when(
        loading: () => const SkeletonList(),
        error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(subsProvider)),
        data: (list) => list.isEmpty
            ? const ErrorView(message: 'No submissions yet.', icon: Icons.inbox_outlined)
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) {
                  final s = list[i];
                  return AppCard(
                    accent: s.status == 'Graded' ? AppColors.secondary : AppColors.tertiary,
                    onTap: () => _gradeDialog(context, ref, s.id, s.studentName),
                    child: Row(children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(s.studentName, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.onSurface)),
                        StatusPill(label: s.status, color: s.status == 'Graded' ? AppColors.secondary : AppColors.tertiary),
                      ])),
                      if (s.marks != null) Text('${s.marks!.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary, fontSize: 18)),
                    ]),
                  );
                },
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
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Grade saved.'), backgroundColor: AppColors.secondary));
    } catch (_) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not save grade.'), backgroundColor: AppColors.error));
    }
  }
}
