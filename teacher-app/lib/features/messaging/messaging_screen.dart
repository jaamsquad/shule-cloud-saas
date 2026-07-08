import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';

/// Teacher → Parent messaging, scoped to the teacher's own classes
/// (/staff-portal/message-parents/*). A broadcast-composer, not 1:1 chat —
/// matches what the backend actually supports today.
class MessagingScreen extends ConsumerStatefulWidget {
  const MessagingScreen({super.key});
  @override
  ConsumerState<MessagingScreen> createState() => _MessagingScreenState();
}

class _MessagingScreenState extends ConsumerState<MessagingScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  final _messageCtrl = TextEditingController();
  String? _selectedClass;
  Set<String> _selectedStudents = {};
  bool _sending = false;

  @override
  void dispose() {
    _tabs.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Message Parents'),
        bottom: TabBar(controller: _tabs, tabs: const [Tab(text: 'Compose'), Tab(text: 'History')]),
      ),
      body: TabBarView(controller: _tabs, children: [_compose(), _history()]),
    );
  }

  Widget _compose() {
    final future = ref.watch(_classesForMessagingProvider);
    return future.when(
      loading: () => const SkeletonList(),
      error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(_classesForMessagingProvider)),
      data: (data) {
        final classes = (data['classes'] as List?) ?? [];
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const SectionHeader('Send To'),
            DropdownButtonFormField<String>(
              initialValue: _selectedClass,
              decoration: const InputDecoration(labelText: 'Class'),
              items: [for (final c in classes) DropdownMenuItem(value: c['className']?.toString(), child: Text('${c['className']} (${(c['students'] as List?)?.length ?? 0})'))],
              onChanged: (v) => setState(() { _selectedClass = v; _selectedStudents = {}; }),
            ),
            const SizedBox(height: 16),
            const SectionHeader('Message'),
            TextField(controller: _messageCtrl, maxLines: 5, decoration: const InputDecoration(hintText: 'Type your message to parents…', alignLabelWithHint: true)),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _sending || _selectedClass == null ? null : _send,
              icon: _sending ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.send),
              label: const Text('Send SMS to Parents'),
            ),
          ],
        );
      },
    );
  }

  Widget _history() {
    final async = ref.watch(_historyProvider);
    return async.when(
      loading: () => const SkeletonList(),
      error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(_historyProvider)),
      data: (list) => list.isEmpty
          ? const ErrorView(message: 'No messages sent yet.', icon: Icons.forum_outlined)
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final m = Map<String, dynamic>.from(list[i] as Map);
                return AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text((m['message'] ?? '').toString(), style: const TextStyle(color: AppColors.onSurface)),
                  const SizedBox(height: 4),
                  Text((m['phone'] ?? '').toString(), style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
                ]));
              },
            ),
    );
  }

  Future<void> _send() async {
    if (_messageCtrl.text.trim().isEmpty || _selectedClass == null) return;
    setState(() => _sending = true);
    try {
      await ref.read(dataRepoProvider).messageParents(message: _messageCtrl.text.trim(), className: _selectedClass);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Message sent.'), backgroundColor: AppColors.secondary));
        _messageCtrl.clear();
        ref.invalidate(_historyProvider);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not send: ${e.toString()}'), backgroundColor: AppColors.error));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }
}

final _classesForMessagingProvider = FutureProvider.autoDispose((ref) => ref.read(dataRepoProvider).messageParentsClasses());
final _historyProvider = FutureProvider.autoDispose((ref) => ref.read(dataRepoProvider).messageParentsHistory());
