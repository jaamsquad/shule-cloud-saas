import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';

/// Academic Results hub (also the Academics tab) — overall grade, subject-trend
/// chart, term assessments, subject averages, and links to sub-sections.
class AcademicsScreen extends ConsumerWidget {
  const AcademicsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final student = ref.watch(selectedStudentProvider);
    final res = ref.watch(resultsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Academic Results')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(resultsProvider),
        child: res.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(resultsProvider)),
          data: (r) => ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (student != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(999)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.school, color: Colors.white, size: 16), const SizedBox(width: 6),
                    Text('${student.name} · ${student.className}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  ]),
                ),

              // Overall mean card
              AppCard(
                accent: AppColors.primary,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('OVERALL MEAN', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 11, fontWeight: FontWeight.w700)),
                    Text(r.overallGrade, style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w800, color: AppColors.primary)),
                    if (r.classRank > 0) Text('Ranked ${r.classRank} in Class', style: const TextStyle(color: AppColors.onSurface)),
                    if (r.changeVsLastTerm != 0)
                      Padding(padding: const EdgeInsets.only(top: 6), child: Text(
                        '${r.changeVsLastTerm > 0 ? '▲ +' : '▼ '}${r.changeVsLastTerm.abs().toStringAsFixed(1)}% from last term',
                        style: TextStyle(color: r.changeVsLastTerm > 0 ? AppColors.primary : AppColors.error, fontWeight: FontWeight.w700))),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Subject performance chart
              if (r.subjects.isNotEmpty) AppCard(
                accent: AppColors.secondary,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('SUBJECT PERFORMANCE', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 11, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 12),
                    SizedBox(height: 160, child: _barChart(r.subjects)),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              const SectionHeader('Term Assessments'),
              for (final a in r.assessments)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: AppCard(child: Row(children: [
                    Container(width: 44, height: 44, decoration: BoxDecoration(color: AppColors.surfaceContainer, borderRadius: BorderRadius.circular(12)),
                        child: const Icon(Icons.assignment_outlined, color: AppColors.primary)),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(a.name, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.onSurface)),
                      if (a.date.isNotEmpty) Text(a.date, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                    ])),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text('${a.score}/${a.outOf}', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 16)),
                      if (a.grade.isNotEmpty) Text(a.grade, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 11)),
                    ]),
                  ])),
                ),

              const SizedBox(height: 8),
              FilledButton.icon(onPressed: () {}, icon: const Icon(Icons.download), label: const Text('Download Report Card')),
              const SizedBox(height: 8),
              if (r.teacherComment != null) Text('Teacher: ${r.teacherComment}', style: const TextStyle(color: AppColors.onSurfaceVariant, fontStyle: FontStyle.italic)),

              const SizedBox(height: 20),
              const SectionHeader('More'),
              _link(context, Icons.event_available, 'Attendance', '/academics/attendance'),
              _link(context, Icons.menu_book, 'Homework', '/academics/homework'),
              _link(context, Icons.schedule, 'Timetable', '/academics/timetable'),
              _link(context, Icons.payments, 'Fees', '/academics/fees'),
              _link(context, Icons.local_library, 'Library', '/academics/library'),
              _link(context, Icons.campaign, 'Announcements', '/academics/announcements'),
              _link(context, Icons.calendar_month, 'School Calendar', '/academics/calendar'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _barChart(List subjects) => BarChart(BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: 100,
        borderData: FlBorderData(show: false),
        gridData: const FlGridData(show: false),
        titlesData: FlTitlesData(
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(sideTitles: SideTitles(
            showTitles: true, getTitlesWidget: (v, meta) {
              final i = v.toInt();
              if (i < 0 || i >= subjects.length) return const SizedBox.shrink();
              final name = subjects[i].subject as String;
              return Padding(padding: const EdgeInsets.only(top: 4), child: Text(name.length > 4 ? name.substring(0, 4) : name, style: const TextStyle(fontSize: 10, color: AppColors.onSurfaceVariant)));
            },
          )),
        ),
        barGroups: [
          for (int i = 0; i < subjects.length; i++)
            BarChartGroupData(x: i, barRods: [BarChartRodData(toY: (subjects[i].percent as double), color: AppColors.secondary, width: 18, borderRadius: BorderRadius.circular(6))]),
        ],
      ));

  Widget _link(BuildContext context, IconData icon, String label, String route) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: AppCard(onTap: () => context.push(route), child: Row(children: [
          Icon(icon, color: AppColors.primary), const SizedBox(width: 12),
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.onSurface))),
          const Icon(Icons.chevron_right, color: AppColors.outline),
        ])),
      );
}
