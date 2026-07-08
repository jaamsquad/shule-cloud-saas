import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/data_providers.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';

/// Gradebook / Marks Entry — mirrors the web StaffMarksEntry.tsx workflow:
/// Save Marks → Submit for Approval → Locked once an HOD approves. Editing a
/// Submitted/Returned/Rejected batch re-sends it for approval; an Approved/
/// Locked batch cannot be edited at all until the HOD unlocks it.
class GradebookScreen extends ConsumerStatefulWidget {
  const GradebookScreen({super.key});
  @override
  ConsumerState<GradebookScreen> createState() => _GradebookScreenState();
}

class _GradebookScreenState extends ConsumerState<GradebookScreen> {
  final Map<String, double?> _edited = {};
  bool _saving = false;
  bool _submitting = false;

  @override
  Widget build(BuildContext context) {
    final sel = ref.watch(selectedClassSubjectProvider);
    final exams = ref.watch(examsProvider);
    final selectedExam = ref.watch(selectedExamProvider);
    final roster = ref.watch(rosterProvider);
    final status = ref.watch(marksStatusProvider);

    final isLocked = status.valueOrNull?.locked ?? false;
    final statusLabel = status.valueOrNull?.status ?? 'Draft';
    final isSubmitted = statusLabel == 'Submitted';
    final isReturned = statusLabel == 'Returned' || statusLabel == 'Rejected';

    return Scaffold(
      appBar: AppBar(title: const Text('Gradebook')),
      body: sel.className.isEmpty
          ? const ErrorView(message: 'Select a class from My Classes first.', icon: Icons.grid_on_outlined)
          : Column(children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  exams.when(
                    loading: () => const LinearProgressIndicator(),
                    error: (_, __) => const Text('Could not load exams.', style: TextStyle(color: AppColors.error)),
                    data: (list) => DropdownButtonFormField<String>(
                      initialValue: selectedExam?.id,
                      decoration: const InputDecoration(labelText: 'Exam'),
                      items: [for (final e in list) DropdownMenuItem(value: e.id, child: Text(e.name))],
                      onChanged: (id) {
                        final e = list.firstWhere((x) => x.id == id);
                        ref.read(selectedExamProvider.notifier).state = e;
                        _edited.clear();
                      },
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(children: [
                    Expanded(child: Text('${sel.className} · ${sel.subject}', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.onSurface))),
                    StatusPill(label: statusLabel, color: isLocked ? AppColors.outline : (isReturned ? AppColors.tertiary : (statusLabel == 'Approved' ? AppColors.secondary : AppColors.primary))),
                  ]),
                ]),
              ),
              if (isSubmitted)
                _banner('These marks are submitted and awaiting approval. Editing will re-send them to the HOD for approval.', AppColors.primary),
              if (isReturned)
                _banner('The HOD ${statusLabel == 'Rejected' ? 'rejected' : 'returned'} these marks. Fix them, then Submit for Approval again.', AppColors.tertiary),
              if (isLocked)
                _banner('These marks are locked by the HOD. Ask them to unlock if a change is needed.', AppColors.outline),
              Expanded(
                child: roster.when(
                  loading: () => const SkeletonList(),
                  error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(rosterProvider)),
                  data: (list) => list.isEmpty
                      ? const ErrorView(message: 'Pick an exam to load the class roster.', icon: Icons.grid_on_outlined)
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          itemCount: list.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (_, i) {
                            final r = list[i];
                            final value = _edited.containsKey(r.studentId) ? _edited[r.studentId] : r.marks;
                            return AppCard(child: Row(children: [
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(r.name, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.onSurface)),
                                if (r.admissionNo.isNotEmpty) Text(r.admissionNo, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                              ])),
                              SizedBox(
                                width: 90,
                                child: TextFormField(
                                  key: ValueKey(r.studentId),
                                  initialValue: value?.toStringAsFixed(0) ?? '',
                                  enabled: !isLocked,
                                  keyboardType: TextInputType.number,
                                  textAlign: TextAlign.center,
                                  decoration: InputDecoration(hintText: '--', filled: true, fillColor: isLocked ? AppColors.surfaceContainerHigh : AppColors.surfaceContainer),
                                  onChanged: (v) => _edited[r.studentId] = double.tryParse(v),
                                ),
                              ),
                            ]));
                          },
                        ),
                ),
              ),
            ]),
      bottomNavigationBar: sel.className.isEmpty ? null : SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(child: FilledButton.icon(
              onPressed: isLocked || _saving ? null : _save,
              icon: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Icon(isLocked ? Icons.lock_outline : Icons.save_outlined),
              label: Text(isLocked ? 'Locked' : 'Save Marks'),
            )),
            if (!isLocked && !isSubmitted) ...[
              const SizedBox(width: 12),
              Expanded(child: OutlinedButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send_outlined),
                label: const Text('Submit for Approval'),
              )),
            ],
          ]),
        ),
      ),
    );
  }

  Widget _banner(String text, Color color) => Container(
        width: double.infinity,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
        child: Text(text, style: TextStyle(color: color, fontSize: 12.5, fontWeight: FontWeight.w600)),
      );

  Future<void> _save() async {
    final sel = ref.read(selectedClassSubjectProvider);
    final exam = ref.read(selectedExamProvider);
    final roster = ref.read(rosterProvider).valueOrNull ?? [];
    if (exam == null || roster.isEmpty) return;
    setState(() => _saving = true);
    try {
      final marks = roster.map((r) => {
            'studentId': r.studentId,
            'marks': _edited.containsKey(r.studentId) ? _edited[r.studentId] : r.marks,
          }).where((m) => m['marks'] != null).toList();
      await ref.read(dataRepoProvider).saveMarks(
            examId: exam.id, examName: exam.name, className: sel.className, subject: sel.subject,
            term: exam.term, outOf: exam.totalMarks, marks: marks,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Marks saved.'), backgroundColor: AppColors.secondary));
        ref.invalidate(rosterProvider);
        ref.invalidate(marksStatusProvider);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not save marks: ${e.toString()}'), backgroundColor: AppColors.error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _submit() async {
    final sel = ref.read(selectedClassSubjectProvider);
    final exam = ref.read(selectedExamProvider);
    if (exam == null) return;
    setState(() => _submitting = true);
    try {
      await ref.read(dataRepoProvider).submitMarks(examId: exam.id, examName: exam.name, className: sel.className, subject: sel.subject);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Submitted for approval.'), backgroundColor: AppColors.primary));
        ref.invalidate(marksStatusProvider);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not submit: ${e.toString()}'), backgroundColor: AppColors.error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }
}
