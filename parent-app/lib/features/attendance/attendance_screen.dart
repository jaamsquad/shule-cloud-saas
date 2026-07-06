import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../models/attendance.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});
  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month);

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(attendanceProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Attendance')),
      body: async.when(
        loading: () => const SkeletonList(),
        error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(attendanceProvider)),
        data: (a) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(children: [
              Expanded(child: StatTile(label: 'Present', value: '${a.present}', color: AppColors.primary, icon: Icons.check_circle_outline)),
              const SizedBox(width: 12),
              Expanded(child: StatTile(label: 'Absent', value: '${a.absent}', color: AppColors.error, icon: Icons.cancel_outlined)),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: StatTile(label: 'Late', value: '${a.late}', color: AppColors.tertiary, icon: Icons.schedule)),
              const SizedBox(width: 12),
              Expanded(child: StatTile(label: 'Rate', value: '${a.monthPercent.toStringAsFixed(0)}%', color: AppColors.secondary, icon: Icons.percent)),
            ]),
            const SizedBox(height: 16),
            _calendar(a),
            const SizedBox(height: 16),
            const SectionHeader('Activity Log'),
            for (final t in a.timeline)
              AppCard(child: Row(children: [
                const Icon(Icons.check_circle, color: AppColors.primary), const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(t.label, style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text(t.detail, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                ])),
                Text(t.time, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
              ])),
            if (a.timeline.isEmpty) const Padding(padding: EdgeInsets.all(16), child: Text('No activity logged yet.', style: TextStyle(color: AppColors.onSurfaceVariant))),
          ],
        ),
      ),
    );
  }

  Widget _calendar(AttendanceSummary a) {
    final first = DateTime(_month.year, _month.month, 1);
    final daysInMonth = DateTime(_month.year, _month.month + 1, 0).day;
    final leading = first.weekday % 7; // Sun=0
    final byDay = {for (final d in a.days) DateTime(d.date.year, d.date.month, d.date.day): d.status};

    Color? dot(AttStatus? s) => switch (s) {
          AttStatus.present => AppColors.primary,
          AttStatus.absent => AppColors.error,
          AttStatus.late => AppColors.tertiary,
          AttStatus.excused => AppColors.secondary,
          _ => null,
        };

    return AppCard(
      child: Column(
        children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            IconButton(onPressed: () => setState(() => _month = DateTime(_month.year, _month.month - 1)), icon: const Icon(Icons.chevron_left)),
            Text('${_monthName(_month.month)} ${_month.year}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            IconButton(onPressed: () => setState(() => _month = DateTime(_month.year, _month.month + 1)), icon: const Icon(Icons.chevron_right)),
          ]),
          GridView.count(
            crossAxisCount: 7, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
            children: [
              for (final d in ['S','M','T','W','T','F','S'])
                Center(child: Text(d, style: const TextStyle(color: AppColors.outline, fontWeight: FontWeight.w600))),
              for (int i = 0; i < leading; i++) const SizedBox(),
              for (int day = 1; day <= daysInMonth; day++)
                Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text('$day'),
                  const SizedBox(height: 2),
                  Container(width: 6, height: 6, decoration: BoxDecoration(
                    color: dot(byDay[DateTime(_month.year, _month.month, day)]) ?? Colors.transparent, shape: BoxShape.circle)),
                ])),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(spacing: 16, children: [
            _legend('Present', AppColors.primary), _legend('Absent', AppColors.error),
            _legend('Late', AppColors.tertiary), _legend('Excused', AppColors.secondary),
          ]),
        ],
      ),
    );
  }

  Widget _legend(String t, Color c) => Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
        const SizedBox(width: 4), Text(t, style: const TextStyle(fontSize: 12)),
      ]);

  String _monthName(int m) => const ['','January','February','March','April','May','June','July','August','September','October','November','December'][m];
}
