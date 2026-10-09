import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/data_providers.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/class_picker.dart';

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});
  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

const _statuses = ['Present', 'Absent', 'Late', 'Excused'];
const _statusColor = {
  'Present': AppColors.green,
  'Absent': AppColors.error,
  'Late': AppColors.tertiary,
  'Excused': AppColors.teal,
};

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  final Map<String, String> _marks = {};
  bool _saving = false;
  String _search = '';

  @override
  Widget build(BuildContext context) {
    // Unsaved marks belong to one class + date; drop them when either changes.
    ref.listen(selectedClassSubjectProvider, (_, __) => setState(_marks.clear));
    ref.listen(attendanceDateProvider, (_, __) => setState(_marks.clear));

    final sel = ref.watch(selectedClassSubjectProvider);
    final date = ref.watch(attendanceDateProvider);
    final roster = ref.watch(attendanceRosterProvider);
    final list = roster.valueOrNull ?? const [];
    String statusOf(String id, String saved) => _marks[id] ?? saved;
    final counts = {for (final s in _statuses) s: list.where((st) => statusOf(st.id, st.status) == s).length};

    return PortalPage(
      title: 'Mark Attendance',
      subtitle: DateFormat('EEEE, d MMMM y').format(date),
      actions: [
        IconButton(
          tooltip: 'Reload',
          onPressed: () => ref.invalidate(attendanceRosterProvider),
          icon: const Icon(Icons.refresh, color: AppColors.slate600),
        ),
      ],
      bottomBar: sel.className.isEmpty
          ? null
          : Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => setState(() {
                    for (final s in list) {
                      _marks[s.id] = 'Present';
                    }
                  }),
                  icon: const Icon(Icons.done_all, size: 18),
                  label: const Text('All Present'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: _saving || _marks.isEmpty ? null : () => _save(sel.className, sel.subject, date),
                  icon: _saving
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.save_outlined, size: 18),
                  label: Text(_marks.isEmpty ? 'Save' : 'Save (${_marks.length})'),
                ),
              ),
            ]),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          PanelCard(
            title: 'Select class',
            icon: Icons.filter_alt_outlined,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const ClassPickerField(),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      final picked = await showDatePicker(context: context, initialDate: date, firstDate: DateTime(2020), lastDate: DateTime(2100));
                      if (picked != null) ref.read(attendanceDateProvider.notifier).state = picked;
                    },
                    icon: const Icon(Icons.calendar_today, size: 16),
                    label: Text(DateFormat('EEE, MMM d').format(date)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    decoration: const InputDecoration(hintText: 'Search…', prefixIcon: Icon(Icons.search, size: 20)),
                    onChanged: (v) => setState(() => _search = v.toLowerCase()),
                  ),
                ),
              ]),
            ]),
          ),
          const SizedBox(height: 16),
          if (sel.className.isEmpty)
            const ErrorView(message: 'Pick a class above to load its register.', icon: Icons.fact_check_outlined)
          else ...[
            if (list.isNotEmpty) ...[
              Row(children: [
                for (final s in _statuses) ...[
                  Expanded(child: _CountChip(label: s, count: counts[s] ?? 0, color: _statusColor[s]!)),
                  if (s != _statuses.last) const SizedBox(width: 8),
                ],
              ]),
              const SizedBox(height: 12),
            ],
            roster.when(
              loading: () => const SkeletonList(),
              error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(attendanceRosterProvider)),
              data: (list) {
                final filtered = _search.isEmpty ? list : list.where((s) => s.name.toLowerCase().contains(_search)).toList();
                if (filtered.isEmpty) return const ErrorView(message: 'No students found.', icon: Icons.person_search_outlined);
                return Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardTheme.color,
                    borderRadius: BorderRadius.circular(AppTheme.radius),
                    border: Border.all(color: AppColors.hairline),
                  ),
                  child: Column(children: [
                    _tableHeader(),
                    for (final (i, s) in filtered.indexed) ...[
                      if (i > 0) const Divider(),
                      _row(i + 1, s.id, s.name, s.admissionNo, statusOf(s.id, s.status)),
                    ],
                  ]),
                );
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _tableHeader() => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: const BoxDecoration(
          color: AppColors.surfaceContainerLow,
          border: Border(bottom: BorderSide(color: AppColors.slate200)),
        ),
        child: const Row(children: [
          SizedBox(width: 28, child: Text('#', style: _th)),
          Expanded(child: Text('STUDENT', style: _th)),
          Text('STATUS', style: _th),
        ]),
      );

  Widget _row(int n, String id, String name, String adm, String current) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(children: [
          SizedBox(width: 28, child: Text('$n', style: const TextStyle(color: AppColors.slate400, fontSize: 12, fontWeight: FontWeight.w700))),
          InitialsAvatar(name: name, radius: 15),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: AppColors.slate800)),
              if (adm.isNotEmpty) Text(adm, style: const TextStyle(color: AppColors.slate500, fontSize: 11.5)),
            ]),
          ),
          for (final st in _statuses) _pill(st, current == st, () => setState(() => _marks[id] = st)),
        ]),
      );

  Widget _pill(String label, bool selected, VoidCallback onTap) {
    final color = _statusColor[label]!;
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Tooltip(
        message: label,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppTheme.radius),
          onTap: onTap,
          child: Container(
            width: 30,
            height: 30,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? color : Colors.white,
              border: Border.all(color: selected ? color : AppColors.slate200),
              borderRadius: BorderRadius.circular(AppTheme.radius),
            ),
            child: Text(label[0], style: TextStyle(color: selected ? Colors.white : AppColors.slate500, fontWeight: FontWeight.w900, fontSize: 12)),
          ),
        ),
      ),
    );
  }

  Future<void> _save(String className, String subject, DateTime date) async {
    setState(() => _saving = true);
    try {
      final ds = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      final records = _marks.entries.map((e) => {'studentId': e.key, 'status': e.value}).toList();
      await ref.read(dataRepoProvider).saveAttendance(className: className, subject: subject.isEmpty ? null : subject, date: ds, records: records);
      if (mounted) {
        showToast(context, 'Attendance saved.');
        setState(_marks.clear);
        ref.invalidate(attendanceRosterProvider);
      }
    } catch (_) {
      if (mounted) showToast(context, 'Could not save attendance. Try again.', error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

const _th = TextStyle(fontSize: 10.5, letterSpacing: 0.6, fontWeight: FontWeight.w900, color: AppColors.slate500);

class _CountChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  const _CountChip({required this.label, required this.count, required this.color});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          border: Border.all(color: color.withValues(alpha: 0.25)),
          borderRadius: BorderRadius.circular(AppTheme.radius),
        ),
        child: Column(children: [
          Text('$count', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 16)),
          Text(label.toUpperCase(), style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 9.5, letterSpacing: 0.4)),
        ]),
      );
}
