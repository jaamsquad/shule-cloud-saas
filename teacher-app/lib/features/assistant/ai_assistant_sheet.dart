import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';

/// A floating AI assistant that uses BUTTONS instead of typing — per spec.
/// Each suggested action routes to the screen that already answers it (the
/// assistant is a fast launcher into real data, not a chat model in this pass).
void showAiAssistantSheet(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => const _AiAssistantSheet(),
  );
}

class _AiAssistantSheet extends StatelessWidget {
  const _AiAssistantSheet();

  @override
  Widget build(BuildContext context) {
    final actions = <(IconData, String, String)>[
      (Icons.person_off_outlined, 'Students absent today', '/attendance'),
      (Icons.trending_down, 'Students below average', '/gradebook'),
      (Icons.assignment_late_outlined, 'Assignments pending grading', '/assignments'),
      (Icons.emoji_events_outlined, 'Top performers', '/gradebook'),
      (Icons.auto_stories_outlined, 'Generate lesson plan', '/lesson-plans/new'),
      (Icons.quiz_outlined, 'Generate quiz', '/lesson-plans/new'),
      (Icons.edit_note_outlined, 'Generate report comments', '/gradebook'),
      (Icons.menu_book_outlined, 'Generate homework', '/assignments/homework/new'),
      (Icons.event_busy_outlined, 'Students with low attendance', '/attendance'),
      (Icons.warning_amber_outlined, 'Behaviour alerts', '/behaviour'),
      (Icons.query_stats_outlined, 'Class performance summary', '/gradebook'),
      (Icons.schedule_outlined, 'Upcoming deadlines', '/assignments'),
    ];

    return SafeArea(
      child: Container(
        margin: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Theme.of(context).cardTheme.color, borderRadius: BorderRadius.circular(24)),
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.75),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
            child: Row(children: [
              Container(width: 36, height: 36, decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.auto_awesome, color: Colors.white, size: 18)),
              const SizedBox(width: 12),
              const Expanded(child: Text('AI Teaching Assistant', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.onSurface))),
              IconButton(onPressed: () => Navigator.of(context).pop(), icon: const Icon(Icons.close)),
            ]),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Align(alignment: Alignment.centerLeft, child: Text('How can I assist your classroom today?', style: TextStyle(color: AppColors.onSurfaceVariant))),
          ),
          const SizedBox(height: 12),
          Flexible(
            child: ListView.separated(
              shrinkWrap: true,
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              itemCount: actions.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final (icon, label, route) = actions[i];
                return Material(
                  color: AppColors.surfaceContainer,
                  borderRadius: BorderRadius.circular(14),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () { Navigator.of(context).pop(); context.push(route); },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      child: Row(children: [
                        Icon(icon, size: 20, color: AppColors.primary),
                        const SizedBox(width: 12),
                        Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.onSurface))),
                        const Icon(Icons.chevron_right, size: 18, color: AppColors.outline),
                      ]),
                    ),
                  ),
                );
              },
            ),
          ),
        ]),
      ),
    );
  }
}
