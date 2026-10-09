import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';

/// Library — books/issues browser. NOTE: /api/v1/library/* is an admin/
/// librarian-oriented, ungated backend module (tenancy header only, no staff
/// scoping) — read-mostly here rather than exposing full CRUD from a teacher's
/// phone.
class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});
  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return PortalPage(
      title: 'Library',
      tabs: TabBar(controller: _tabs, tabs: const [Tab(text: 'Books'), Tab(text: 'My Issues')]),
      body: TabBarView(controller: _tabs, children: [_books(), _issues()]),
    );
  }

  Widget _books() {
    final async = ref.watch(_booksProvider);
    return async.when(
      loading: () => const SkeletonList(),
      error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(_booksProvider)),
      data: (list) => list.isEmpty
          ? const ErrorView(message: 'No books found.', icon: Icons.menu_book_outlined)
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final b = Map<String, dynamic>.from(list[i] as Map);
                return AppCard(child: Row(children: [
                  Container(width: 40, height: 40, decoration: BoxDecoration(color: AppColors.secondary.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(AppTheme.radiusLg)),
                      child: const Icon(Icons.menu_book, color: AppColors.secondary)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text((b['title'] ?? 'Untitled').toString(), style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.onSurface)),
                    Text((b['author'] ?? '').toString(), style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                  ])),
                  StatusPill(label: '${b['availableCopies'] ?? b['stock'] ?? 0} left', color: AppColors.secondary),
                ]));
              },
            ),
    );
  }

  Widget _issues() {
    final async = ref.watch(_issuesProvider);
    return async.when(
      loading: () => const SkeletonList(),
      error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(_issuesProvider)),
      data: (list) => list.isEmpty
          ? const ErrorView(message: 'No active issues.', icon: Icons.assignment_return_outlined)
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final b = Map<String, dynamic>.from(list[i] as Map);
                final overdue = b['overdue'] == true;
                return AppCard(accent: overdue ? AppColors.error : AppColors.primary, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text((b['bookTitle'] ?? b['title'] ?? 'Book').toString(), style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.onSurface)),
                  Text('Due: ${b['dueDate'] ?? '—'}', style: TextStyle(color: overdue ? AppColors.error : AppColors.onSurfaceVariant, fontSize: 12)),
                ]));
              },
            ),
    );
  }
}

final _booksProvider = FutureProvider.autoDispose((ref) => ref.read(dataRepoProvider).libraryBooks());
final _issuesProvider = FutureProvider.autoDispose((ref) => ref.read(dataRepoProvider).libraryIssues());
