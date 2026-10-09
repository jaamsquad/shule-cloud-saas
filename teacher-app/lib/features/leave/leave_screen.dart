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
    return PortalPage(
      title: 'Leave Requests',
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: FilledButton.icon(
            style: FilledButton.styleFrom(minimumSize: const Size(0, 38), padding: const EdgeInsets.symmetric(horizontal: 14)),
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const _NewLeaveScreen())),
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Request'),
          ),
        ),
      ],
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(leaveRequestsProvider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(leaveRequestsProvider)),
          data: (list) => list.isEmpty
              ? const ErrorView(message: 'No leave requests yet.', icon: Icons.event_available_outlined)
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final l = Map<String, dynamic>.from(list[i] as Map);
                    final status = (l['status'] ?? 'pending').toString();
                    final color = status == 'approved' ? AppColors.green : (status == 'rejected' ? AppColors.error : AppColors.tertiary);
                    return AppCard(accent: color, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Text((l['type'] ?? 'Leave').toString(), style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate800))),
                        StatusPill(label: status[0].toUpperCase() + status.substring(1), color: color),
                      ]),
                      const SizedBox(height: 4),
                      Row(children: [
                        const Icon(Icons.date_range_outlined, size: 14, color: AppColors.goldText),
                        const SizedBox(width: 4),
                        Text('${_d(l['startDate'])} → ${_d(l['endDate'])}',
                            style: const TextStyle(color: AppColors.goldText, fontSize: 12.5, fontWeight: FontWeight.w600)),
                      ]),
                      if ((l['reason'] ?? '').toString().isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Text(l['reason'].toString(), style: const TextStyle(color: AppColors.onSurfaceVariant))),
                    ]));
                  },
                ),
        ),
      ),
    );
  }
}

String _d(Object? raw) {
  final d = DateTime.tryParse('${raw ?? ''}');
  return d == null ? '${raw ?? ''}' : DateFormat('d MMM y').format(d);
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
    return PortalPage(
      title: 'Request Leave',
      bottomBar: FilledButton.icon(
        onPressed: _saving ? null : _submit,
        icon: _saving
            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : const Icon(Icons.send_outlined, size: 18),
        label: const Text('Submit Request'),
      ),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: [
        PanelCard(
          title: 'Leave application',
          icon: Icons.event_note_outlined,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const FieldLabel('Leave Type'),
            DropdownButtonFormField<String>(
              initialValue: _type,
              items: [for (final t in _types) DropdownMenuItem(value: t, child: Text(t))],
              onChanged: (v) => setState(() => _type = v ?? _type),
            ),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  const FieldLabel('Start Date'),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final picked = await showDatePicker(context: context, initialDate: DateTime.now(), firstDate: DateTime.now(), lastDate: DateTime(2100));
                      if (picked != null) setState(() => _start = picked);
                    },
                    icon: const Icon(Icons.calendar_today, size: 16),
                    label: Text(_start == null ? 'Pick date' : DateFormat('MMM d').format(_start!)),
                  ),
                ]),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  const FieldLabel('End Date'),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final picked = await showDatePicker(
                          context: context, initialDate: _start ?? DateTime.now(), firstDate: _start ?? DateTime.now(), lastDate: DateTime(2100));
                      if (picked != null) setState(() => _end = picked);
                    },
                    icon: const Icon(Icons.calendar_today, size: 16),
                    label: Text(_end == null ? 'Pick date' : DateFormat('MMM d').format(_end!)),
                  ),
                ]),
              ),
            ]),
            const SizedBox(height: 14),
            const FieldLabel('Reason'),
            TextField(controller: _reasonCtrl, maxLines: 4, decoration: const InputDecoration(hintText: 'Briefly explain the reason for leave')),
          ]),
        ),
      ]),
    );
  }

  Future<void> _submit() async {
    if (_start == null || _end == null || _reasonCtrl.text.trim().isEmpty) {
      showToast(context, 'Fill in dates and a reason.', error: true);
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
        showToast(context, 'Could not submit: $e', error: true);
        setState(() => _saving = false);
      }
    }
  }
}
