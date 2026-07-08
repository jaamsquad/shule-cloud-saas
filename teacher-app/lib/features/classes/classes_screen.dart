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
    return Scaffold(
      appBar: AppBar(title: const Text('My Classes')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(myClassesProvider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(myClassesProvider)),
          data: (list) => list.isEmpty
              ? const ErrorView(message: 'No classes assigned yet.', icon: Icons.school_outlined)
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) {
                    final c = list[i];
                    return AppCard(
                      accent: c.isClassTeacher ? AppColors.secondary : AppColors.primary,
                      onTap: () => context.push('/classes/detail', extra: c),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Expanded(child: Text(c.className, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: AppColors.onSurface))),
                          if (c.isClassTeacher) const StatusPill(label: 'Homeroom', color: AppColors.secondary),
                        ]),
                        const SizedBox(height: 4),
                        Row(children: [
                          if (c.subject.isNotEmpty) ...[
                            const Icon(Icons.menu_book, size: 14, color: AppColors.onSurfaceVariant), const SizedBox(width: 4),
                            Text(c.subject, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13)),
                            const SizedBox(width: 12),
                          ],
                          const Icon(Icons.groups_outlined, size: 14, color: AppColors.onSurfaceVariant), const SizedBox(width: 4),
                          Text('${c.studentCount} Students', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13)),
                        ]),
                      ]),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
