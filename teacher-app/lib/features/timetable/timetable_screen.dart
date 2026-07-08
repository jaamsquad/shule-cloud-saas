import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';

class TimetableScreen extends ConsumerStatefulWidget {
  const TimetableScreen({super.key});
  @override
  ConsumerState<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends ConsumerState<TimetableScreen> {
  static const _days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  String _day = 'Monday';

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(timetableProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Timetable')),
      body: Column(children: [
        Padding(padding: const EdgeInsets.all(16), child: FilterChipBar(items: _days, selected: _day, onSelect: (d) => setState(() => _day = d))),
        Expanded(child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(timetableProvider)),
          data: (grid) {
            final daySlots = grid.grid[_day] ?? {};
            if (grid.timeSlots.isEmpty) return const ErrorView(message: 'No timetable published yet.', icon: Icons.schedule_outlined);
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              itemCount: grid.timeSlots.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final slot = grid.timeSlots[i];
                final lesson = daySlots[slot];
                if (lesson == null || lesson.isEmpty) {
                  return AppCard(child: Row(children: [
                    Text(slot, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                    const SizedBox(width: 12),
                    const Expanded(child: Text('Free period', style: TextStyle(color: AppColors.onSurfaceVariant, fontStyle: FontStyle.italic))),
                  ]));
                }
                return AppCard(accent: AppColors.primary, child: Row(children: [
                  SizedBox(width: 70, child: Text(slot, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 11, fontWeight: FontWeight.w600))),
                  const SizedBox(width: 8),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(lesson.subject, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.onSurface)),
                    Text('${lesson.className}${lesson.room.isNotEmpty ? ' · ${lesson.room}' : ''}', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                  ])),
                ]));
              },
            );
          },
        )),
      ]),
    );
  }
}
