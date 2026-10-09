import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../models/timetable.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';

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
      title: 'My Timetable',
      subtitle: _day,
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(timetableProvider),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            FilterChipBar(items: _days, selected: _day, onSelect: (d) => setState(() => _day = d)),
            const SizedBox(height: 14),
            async.when(
              loading: () => const SkeletonList(),
              error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(timetableProvider)),
              data: (grid) {
                if (grid.timeSlots.isEmpty) return const ErrorView(message: 'No timetable published yet.', icon: Icons.schedule_outlined);
                final daySlots = grid.grid[_day] ?? {};
                final lessons = grid.timeSlots.where((s) => daySlots[s] != null && !daySlots[s]!.isEmpty).length;
                return PanelCard(
                  title: '$_day · $lessons lesson${lessons == 1 ? '' : 's'}',
                  icon: Icons.calendar_view_day_outlined,
                  padding: EdgeInsets.zero,
                  child: Column(children: [
                    for (final (i, slot) in grid.timeSlots.indexed) ...[
                      if (i > 0) const Divider(),
                      _slotRow(slot, daySlots[slot]),
                    ],
                  ]),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _slotRow(String slot, LessonSlot? lesson) {
    final free = lesson == null || lesson.isEmpty;
    return IntrinsicHeight(
      child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(
          width: 92,
          color: AppColors.surfaceContainerLow,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
          child: Text(slot, style: const TextStyle(color: AppColors.slate600, fontSize: 11.5, fontWeight: FontWeight.w800)),
        ),
        Container(width: 3, color: free ? Colors.transparent : AppColors.teal),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: free
                ? const Text('Free period', style: TextStyle(color: AppColors.slate400, fontStyle: FontStyle.italic, fontSize: 13))
                : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(lesson.subject, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate800)),
                    Text('${lesson.className}${lesson.room.isNotEmpty ? ' · ${lesson.room}' : ''}',
                        style: const TextStyle(color: AppColors.goldText, fontSize: 12.5, fontWeight: FontWeight.w600)),
                  ]),
          ),
        ),
      ]),
    );
  }
}
