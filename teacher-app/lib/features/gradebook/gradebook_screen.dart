import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/data_providers.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/class_picker.dart';

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
    // Edits belong to one class + exam; drop them when either changes.
    ref.listen(selectedClassSubjectProvider, (_, __) => _edited.clear());

    final sel = ref.watch(selectedClassSubjectProvider);
    final exams = ref.watch(examsProvider);
    final selectedExam = ref.watch(selectedExamProvider);
    final roster = ref.watch(rosterProvider);
    final status = ref.watch(marksStatusProvider);

    final isLocked = status.valueOrNull?.locked ?? false;
    final statusLabel = status.valueOrNull?.status ?? 'Draft';
    final isSubmitted = statusLabel == 'Submitted';
    final isReturned = statusLabel == 'Returned' || statusLabel == 'Rejected';
    final statusColor = isLocked
        ? AppColors.slate500
        : (isReturned ? AppColors.tertiary : (statusLabel == 'Approved' ? AppColors.green : AppColors.teal));
    final ready = sel.className.isNotEmpty && selectedExam != null;

    return PortalPage(
      title: 'Marks Entry',
      subtitle: sel.className.isEmpty ? null : '${sel.className}${sel.subject.isEmpty ? '' : ' · ${sel.subject}'}',
      bottomBar: !ready
          ? null
          : Row(children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: isLocked || _saving ? null : _save,
                  icon: _saving
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Icon(isLocked ? Icons.lock_outline : Icons.save_outlined, size: 18),
                  label: Text(isLocked ? 'Locked' : 'Save Marks'),
                ),
              ),
              if (!isLocked && !isSubmitted) ...[
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: AppColors.navy),
                    onPressed: _submitting ? null : _submit,
                    icon: _submitting
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.send_outlined, size: 18),
                    label: const Text('Submit'),
                  ),
                ),
              ],
            ]),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          PanelCard(
            title: 'Select exam & class',
            icon: Icons.filter_alt_outlined,
            action: ready ? _StripPill(label: statusLabel) : null,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const FieldLabel('Class & Subject'),
              const ClassPickerField(),
              const SizedBox(height: 12),
              const FieldLabel('Exam'),
              exams.when(
                loading: () => const LinearProgressIndicator(),
                error: (_, __) => const Text('Could not load exams.', style: TextStyle(color: AppColors.error)),
                data: (list) => DropdownButtonFormField<String>(
                  initialValue: list.any((e) => e.id == selectedExam?.id) ? selectedExam?.id : null,
                  isExpanded: true,
                  decoration: const InputDecoration(hintText: 'Select exam', prefixIcon: Icon(Icons.assignment_outlined)),
                  items: [for (final e in list) DropdownMenuItem(value: e.id, child: Text(e.name, overflow: TextOverflow.ellipsis))],
                  onChanged: (id) {
                    final e = list.firstWhere((x) => x.id == id);
                    ref.read(selectedExamProvider.notifier).state = e;
                    _edited.clear();
                  },
                ),
              ),
            ]),
          ),
          const SizedBox(height: 12),
          if (isSubmitted)
            const _Gap(InfoBanner(
                text: 'These marks are submitted and awaiting approval. Editing will re-send them to the HOD for approval.',
                icon: Icons.hourglass_top)),
          if (isReturned)
            _Gap(InfoBanner(
                text: 'The HOD ${statusLabel == 'Rejected' ? 'rejected' : 'returned'} these marks. Fix them, then Submit for Approval again.',
                color: AppColors.tertiary,
                icon: Icons.undo)),
          if (isLocked)
            const _Gap(InfoBanner(
                text: 'These marks are locked by the HOD. Ask them to unlock if a change is needed.',
                color: AppColors.slate500,
                icon: Icons.lock_outline)),
          if (!ready)
            const ErrorView(message: 'Pick a class and an exam to load the mark sheet.', icon: Icons.edit_note_outlined)
          else
            roster.when(
              loading: () => const SkeletonList(),
              error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(rosterProvider)),
              data: (list) => list.isEmpty
                  ? const ErrorView(message: 'No students on this roster.', icon: Icons.person_search_outlined)
                  : Container(
                      decoration: BoxDecoration(
                        color: Theme.of(context).cardTheme.color,
                        borderRadius: BorderRadius.circular(AppTheme.radius),
                        border: Border.all(color: AppColors.hairline),
                      ),
                      child: Column(children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: const BoxDecoration(
                            color: AppColors.surfaceContainerLow,
                            border: Border(bottom: BorderSide(color: AppColors.slate200)),
                          ),
                          child: Row(children: [
                            const SizedBox(width: 28, child: Text('#', style: _th)),
                            const Expanded(child: Text('STUDENT', style: _th)),
                            SizedBox(
                              width: 84,
                              child: Text('MARKS${selectedExam.totalMarks > 0 ? ' /${selectedExam.totalMarks.toStringAsFixed(0)}' : ''}',
                                  textAlign: TextAlign.center, style: _th),
                            ),
                          ]),
                        ),
                        for (final (i, r) in list.indexed) ...[
                          if (i > 0) const Divider(),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            child: Row(children: [
                              SizedBox(
                                width: 28,
                                child: Text('${i + 1}', style: const TextStyle(color: AppColors.slate400, fontSize: 12, fontWeight: FontWeight.w700)),
                              ),
                              Expanded(
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(r.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: AppColors.slate800)),
                                  if (r.admissionNo.isNotEmpty) Text(r.admissionNo, style: const TextStyle(color: AppColors.slate500, fontSize: 11.5)),
                                ]),
                              ),
                              SizedBox(
                                width: 84,
                                child: TextFormField(
                                  key: ValueKey('${selectedExam.id}-${r.studentId}'),
                                  initialValue: (_edited.containsKey(r.studentId) ? _edited[r.studentId] : r.marks)?.toStringAsFixed(0) ?? '',
                                  enabled: !isLocked,
                                  keyboardType: TextInputType.number,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate800),
                                  decoration: InputDecoration(
                                    hintText: '--',
                                    fillColor: isLocked ? AppColors.slate100 : Colors.white,
                                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                                  ),
                                  onChanged: (v) => _edited[r.studentId] = double.tryParse(v),
                                ),
                              ),
                            ]),
                          ),
                        ],
                      ]),
                    ),
            ),
          if (ready) ...[
            const SizedBox(height: 8),
            Row(children: [
              const Text('Status: ', style: TextStyle(color: AppColors.slate500, fontSize: 12, fontWeight: FontWeight.w600)),
              StatusPill(label: statusLabel, color: statusColor),
            ]),
          ],
        ],
      ),
    );
  }

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
        showToast(context, 'Marks saved.');
        ref.invalidate(rosterProvider);
        ref.invalidate(marksStatusProvider);
      }
    } catch (e) {
      if (mounted) showToast(context, 'Could not save marks: $e', error: true);
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
        showToast(context, 'Submitted for approval.');
        ref.invalidate(marksStatusProvider);
      }
    } catch (e) {
      if (mounted) showToast(context, 'Could not submit: $e', error: true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }
}

const _th = TextStyle(fontSize: 10.5, letterSpacing: 0.6, fontWeight: FontWeight.w900, color: AppColors.slate500);

class _Gap extends StatelessWidget {
  final Widget child;
  const _Gap(this.child);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 12), child: child);
}

/// Workflow status shown on the gold strip.
class _StripPill extends StatelessWidget {
  final String label;
  const _StripPill({required this.label});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.25), borderRadius: BorderRadius.circular(4)),
        child: Text(label.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 10, letterSpacing: 0.4, fontWeight: FontWeight.w900)),
      );
}
