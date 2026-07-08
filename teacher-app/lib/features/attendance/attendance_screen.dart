import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/data_providers.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});
  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

const _statuses = ['Present', 'Absent', 'Late', 'Excused'];
final _statusColor = {
  'Present': AppColors.secondary, 'Absent': AppColors.error,
  'Late': AppColors.tertiary, 'Excused': AppColors.primaryContainer,
};

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  final Map<String, String> _marks = {};
  bool _saving = false;
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final sel = ref.watch(selectedClassSubjectProvider);
    final date = ref.watch(attendanceDateProvider);
    final roster = ref.watch(attendanceRosterProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Take Attendance')),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            Row(children: [
              Expanded(child: OutlinedButton.icon(
                onPressed: () async {
                  final picked = await showDatePicker(context: context, initialDate: date, firstDate: DateTime(2020), lastDate: DateTime(2100));
                  if (picked != null) ref.read(attendanceDateProvider.notifier).state = picked;
                },
                icon: const Icon(Icons.calendar_today, size: 16),
                label: Text(DateFormat('EEE, MMM d').format(date)),
              )),
              const SizedBox(width: 8),
              IconButton.filled(onPressed: () => ref.invalidate(attendanceRosterProvider), icon: const Icon(Icons.refresh)),
            ]),
            const SizedBox(height: 8),
            TextField(
              decoration: const InputDecoration(hintText: 'Search students…', prefixIcon: Icon(Icons.search)),
              onChanged: (v) => setState(() => _search = v.toLowerCase()),
            ),
          ]),
        ),
        if (sel.className.isEmpty)
          Expanded(child: ErrorView(message: 'Select a class from My Classes first.', icon: Icons.school_outlined, onRetry: () => {}))
        else
          Expanded(
            child: roster.when(
              loading: () => const SkeletonList(),
              error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(attendanceRosterProvider)),
              data: (list) {
                final filtered = _search.isEmpty ? list : list.where((s) => s.name.toLowerCase().contains(_search)).toList();
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final s = filtered[i];
                    final current = _marks[s.id] ?? (s.status.isNotEmpty ? s.status : '');
                    return AppCard(child: Row(children: [
                      CircleAvatar(radius: 18, backgroundColor: AppColors.surfaceContainer, child: Text(initials(s.name), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.onSurface))),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(s.name, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.onSurface)),
                        if (s.admissionNo.isNotEmpty) Text(s.admissionNo, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                      ])),
                      Wrap(spacing: 4, children: [
                        for (final st in _statuses)
                          _pill(st, current == st, () => setState(() => _marks[s.id] = st)),
                      ]),
                    ]));
                  },
                );
              },
            ),
          ),
      ]),
      bottomNavigationBar: sel.className.isEmpty ? null : SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(child: OutlinedButton(
              onPressed: () {
                final list = roster.valueOrNull ?? [];
                setState(() { for (final s in list) { _marks[s.id] = 'Present'; } });
              },
              child: const Text('Mark All Present'),
            )),
            const SizedBox(width: 12),
            Expanded(child: FilledButton(
              onPressed: _saving ? null : () => _save(sel.className, sel.subject, date),
              child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Save'),
            )),
          ]),
        ),
      ),
    );
  }

  Widget _pill(String label, bool selected, VoidCallback onTap) {
    final color = _statusColor[label]!;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(color: selected ? color : AppColors.surfaceContainer, borderRadius: BorderRadius.circular(8)),
        child: Text(label[0], style: TextStyle(color: selected ? Colors.white : AppColors.onSurfaceVariant, fontWeight: FontWeight.w800, fontSize: 12)),
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
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Attendance saved.'), backgroundColor: AppColors.secondary));
        ref.invalidate(attendanceRosterProvider);
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not save attendance. Try again.'), backgroundColor: AppColors.error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
