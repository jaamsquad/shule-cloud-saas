import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/app_theme.dart';
import '../../models/student.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/status_chip.dart';

/// Student list for today's route: search, filter chips, swipe to board/drop.
class StudentsScreen extends ConsumerStatefulWidget {
  const StudentsScreen({super.key});
  @override
  ConsumerState<StudentsScreen> createState() => _StudentsScreenState();
}

class _StudentsScreenState extends ConsumerState<StudentsScreen> {
  String _query = '';
  BoardingStatus? _filter;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(studentsControllerProvider);
    final ctrl = ref.read(studentsControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Students')),
      body: async.when(
        loading: () => const SkeletonList(),
        error: (e, _) => ErrorView.fromError(e, onRetry: ctrl.load),
        data: (all) {
          final filtered = all.where((s) {
            final matchesQuery = _query.isEmpty ||
                s.name.toLowerCase().contains(_query.toLowerCase()) ||
                s.admissionNo.toLowerCase().contains(_query.toLowerCase());
            final matchesFilter = _filter == null || s.status == _filter;
            return matchesQuery && matchesFilter;
          }).toList();

          final boarded = all.where((s) => s.status == BoardingStatus.boarded).length;

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: TextField(
                  decoration: const InputDecoration(hintText: 'Search Student…', prefixIcon: Icon(Icons.search)),
                  onChanged: (v) => setState(() => _query = v),
                ),
              ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Row(
                  children: [
                    _chip('All ${all.length}', null),
                    _chip('Waiting ${all.where((s) => s.status == BoardingStatus.waiting).length}', BoardingStatus.waiting),
                    _chip('Boarded $boarded', BoardingStatus.boarded),
                  ],
                ),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: ctrl.load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => _StudentTile(
                      student: filtered[i],
                      onBoard: () => _act(() => ctrl.board(filtered[i].id)),
                      onDrop: () => _act(() => ctrl.drop(filtered[i].id)),
                    ),
                  ),
                ),
              ),
              _summaryBar(all),
            ],
          );
        },
      ),
    );
  }

  Future<void> _act(Future<void> Function() fn) async {
    try {
      await fn();
    } on BoardingRuleError catch (e) {
      // A rule violation (e.g. already boarded/dropped) — show the reason.
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: AppColors.danger),
        );
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not update — will retry when online')));
    }
  }

  Widget _chip(String label, BoardingStatus? value) => Padding(
        padding: const EdgeInsets.only(right: 8),
        child: ChoiceChip(
          label: Text(label),
          selected: _filter == value,
          onSelected: (_) => setState(() => _filter = value),
        ),
      );

  Widget _summaryBar(List<Student> all) {
    final boarded = all.where((s) => s.status == BoardingStatus.boarded).length;
    final remaining = all.where((s) => s.status == BoardingStatus.waiting).length;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
      decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.border))),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _stat('Assigned', all.length.toString(), AppColors.textDark),
          _stat('Boarded', boarded.toString(), AppColors.primary),
          _stat('Remaining', remaining.toString(), AppColors.danger),
        ],
      ),
    );
  }

  Widget _stat(String label, String value, Color color) => Column(
        children: [
          Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color)),
          Text(label, style: const TextStyle(color: AppColors.textMuted)),
        ],
      );
}

class _StudentTile extends StatelessWidget {
  final Student student;
  final VoidCallback onBoard;
  final VoidCallback onDrop;
  const _StudentTile({required this.student, required this.onBoard, required this.onDrop});

  @override
  Widget build(BuildContext context) {
    // Board only when waiting; Drop only when boarded. (Dropped is terminal.)
    final canBoard = student.status == BoardingStatus.waiting;
    final canDrop = student.status == BoardingStatus.boarded;
    return Slidable(
      startActionPane: canBoard
          ? ActionPane(motion: const DrawerMotion(), children: [
              SlidableAction(onPressed: (_) => onBoard(), backgroundColor: AppColors.primary, foregroundColor: Colors.white, icon: Icons.check, label: 'Board'),
            ])
          : null,
      endActionPane: canDrop
          ? ActionPane(motion: const DrawerMotion(), children: [
              SlidableAction(onPressed: (_) => onDrop(), backgroundColor: AppColors.accentBlue, foregroundColor: Colors.white, icon: Icons.logout, label: 'Drop'),
            ])
          : null,
      child: AppCard(
        onTap: () => context.push('/student/${student.id}'),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: student.photoUrl != null
                  ? CachedNetworkImage(imageUrl: student.photoUrl!, width: 48, height: 48, fit: BoxFit.cover)
                  : Container(width: 48, height: 48, color: AppColors.primary.withValues(alpha: 0.12), child: const Icon(Icons.person, color: AppColors.primary)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(student.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  const SizedBox(height: 2),
                  Text('#${student.admissionNo} • ${student.className} • ${student.pickupStop}',
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                ],
              ),
            ),
            _statusChip(student.status),
          ],
        ),
      ),
    );
  }

  Widget _statusChip(BoardingStatus s) => switch (s) {
        BoardingStatus.boarded => const StatusChip(label: 'Boarded', color: AppColors.primary),
        BoardingStatus.dropped => const StatusChip(label: 'Dropped', color: AppColors.accentBlue),
        BoardingStatus.waiting => const StatusChip(label: 'Waiting', color: AppColors.textMuted),
      };
}
