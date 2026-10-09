import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';

class ClassesScreen extends ConsumerWidget {
  const ClassesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(myClassesProvider);
    return PortalPage(
      title: 'My Classes',
      subtitle: async.valueOrNull == null ? null : '${async.valueOrNull!.length} class/subject assignments',
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(myClassesProvider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(myClassesProvider)),
          data: (list) => list.isEmpty
              ? const ErrorView(message: 'No classes assigned yet.', icon: Icons.school_outlined)
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final c = list[i];
                    final color = c.isClassTeacher ? AppColors.green : AppColors.teal;
                    return AppCard(
                      onTap: () => context.push('/classes/detail', extra: c),
                      child: Row(children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppTheme.radiusLg)),
                          child: Icon(c.isClassTeacher ? Icons.home_work_outlined : Icons.groups_outlined, color: color, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              Flexible(
                                child: Text(c.className,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.slate800)),
                              ),
                              if (c.isClassTeacher) ...[const SizedBox(width: 8), const StatusPill(label: 'Class Teacher', color: AppColors.green)],
                            ]),
                            const SizedBox(height: 3),
                            Wrap(spacing: 12, runSpacing: 2, children: [
                              if (c.subject.isNotEmpty) _meta(Icons.menu_book_outlined, c.subject),
                              _meta(Icons.people_outline, '${c.studentCount} Students'),
                            ]),
                          ]),
                        ),
                        const Icon(Icons.chevron_right, color: AppColors.slate400),
                      ]),
                    );
                  },
                ),
        ),
      ),
    );
  }

  Widget _meta(IconData icon, String text) => Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 14, color: AppColors.slate500),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(color: AppColors.slate500, fontSize: 12.5, fontWeight: FontWeight.w600)),
      ]);
}
