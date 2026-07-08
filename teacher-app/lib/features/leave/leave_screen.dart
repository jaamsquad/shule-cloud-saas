import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/data_providers.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';

class LeaveScreen extends ConsumerWidget {
  const LeaveScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(leaveRequestsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Leave Requests')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const _NewLeaveScreen())),
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(leaveRequestsProvider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(leaveRequestsProvider)),
          data: (list) => list.isEmpty
              ? const ErrorView(message: 'No leave requests yet.', icon: Icons.event_available_outlined)
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final l = Map<String, dynamic>.from(list[i] as Map);
                    final status = (l['status'] ?? 'pending').toString();
                    final color = status == 'approved' ? AppColors.secondary : (status == 'rejected' ? AppColors.error : AppColors.tertiary);
                    return AppCard(accent: color, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Text((l['type'] ?? 'Leave').toString(), style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.onSurface))),
                        StatusPill(label: status[0].toUpperCase() + status.substring(1), color: color),
                      ]),
                      const SizedBox(height: 4),
                      Text('${l['startDate'] ?? ''} → ${l['endDate'] ?? ''}', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                      if ((l['reason'] ?? '').toString().isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Text(l['reason'].toString(), style: const TextStyle(color: AppColors.onSurfaceVariant))),
                    ]));
                  },
                ),
        ),
      ),
    );
  }
}

class _NewLeaveScreen extends ConsumerStatefulWidget {
  const _NewLeaveScreen();
  @override
  ConsumerState<_NewLeaveScreen> createState() => _NewLeaveScreenState();
}

class _NewLeaveScreenState extends ConsumerState<_NewLeaveScreen> {
  String _type = 'Medical Leave';
  DateTime? _start;
  DateTime? _end;
  final _reasonCtrl = TextEditingController();
  bool _saving = false;

  static const _types = ['Medical Leave', 'Official Leave', 'Annual Leave', 'Compassionate Leave'];

  @override
  void dispose() { _reasonCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Request Leave')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        DropdownButtonFormField<String>(
          initialValue: _type, decoration: const InputDecoration(labelText: 'Leave Type'),
          items: [for (final t in _types) DropdownMenuItem(value: t, child: Text(t))],
          onChanged: (v) => setState(() => _type = v ?? _type),
        ),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: OutlinedButton.icon(
            onPressed: () async {
              final picked = await showDatePicker(context: context, initialDate: DateTime.now(), firstDate: DateTime.now(), lastDate: DateTime(2100));
              if (picked != null) setState(() => _start = picked);
            },
            icon: const Icon(Icons.calendar_today, size: 16),
            label: Text(_start == null ? 'Start Date' : DateFormat('MMM d').format(_start!)),
          )),
          const SizedBox(width: 12),
          Expanded(child: OutlinedButton.icon(
            onPressed: () async {
              final picked = await showDatePicker(context: context, initialDate: _start ?? DateTime.now(), firstDate: _start ?? DateTime.now(), lastDate: DateTime(2100));
              if (picked != null) setState(() => _end = picked);
            },
            icon: const Icon(Icons.calendar_today, size: 16),
            label: Text(_end == null ? 'End Date' : DateFormat('MMM d').format(_end!)),
          )),
        ]),
        const SizedBox(height: 12),
        TextField(controller: _reasonCtrl, maxLines: 4, decoration: const InputDecoration(labelText: 'Reason', alignLabelWithHint: true)),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _saving ? null : _submit,
          child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Submit Request'),
        ),
      ]),
    );
  }

  Future<void> _submit() async {
    if (_start == null || _end == null || _reasonCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Fill in dates and a reason.'), backgroundColor: AppColors.error));
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(dataRepoProvider).requestLeave(
        type: _type, startDate: _start!.toIso8601String(), endDate: _end!.toIso8601String(), reason: _reasonCtrl.text.trim(),
      );
      ref.invalidate(leaveRequestsProvider);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not submit: ${e.toString()}'), backgroundColor: AppColors.error));
        setState(() => _saving = false);
      }
    }
  }
}
