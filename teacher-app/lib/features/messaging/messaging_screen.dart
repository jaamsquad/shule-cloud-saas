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
  bool _sending = false;

  @override
  void dispose() {
    _tabs.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PortalPage(
      title: 'Message Parents',
      subtitle: 'SMS parents of students in your classes',
      tabs: TabBar(controller: _tabs, tabs: const [Tab(text: 'Compose'), Tab(text: 'History')]),
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
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            PanelCard(
              title: 'New message',
              icon: Icons.sms_outlined,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const FieldLabel('Send To'),
                DropdownButtonFormField<String>(
                  initialValue: _selectedClass,
                  isExpanded: true,
                  decoration: const InputDecoration(hintText: 'Select class', prefixIcon: Icon(Icons.groups_outlined)),
                  items: [
                    for (final c in classes)
                      DropdownMenuItem(
                        value: c['className']?.toString(),
                        child: Text('${c['className']} (${(c['students'] as List?)?.length ?? 0} students)'),
                      ),
                  ],
                  onChanged: (v) => setState(() => _selectedClass = v),
                ),
                const SizedBox(height: 14),
                const FieldLabel('Message'),
                TextField(
                  controller: _messageCtrl,
                  maxLines: 6,
                  maxLength: 480,
                  decoration: const InputDecoration(hintText: 'Type your message to parents…'),
                ),
                const SizedBox(height: 8),
                FilledButton.icon(
                  onPressed: _sending || _selectedClass == null ? null : _send,
                  icon: _sending
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.send, size: 18),
                  label: const Text('Send SMS to Parents'),
                ),
              ]),
            ),
            const SizedBox(height: 16),
            const InfoBanner(text: 'Messages go to the parent phone numbers on file for the selected class.', icon: Icons.info_outline),
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
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final m = Map<String, dynamic>.from(list[i] as Map);
                return AppCard(
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(color: AppColors.teal.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppTheme.radius)),
                      child: const Icon(Icons.sms_outlined, size: 17, color: AppColors.teal),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text((m['message'] ?? '').toString(), style: const TextStyle(color: AppColors.slate800, fontSize: 13.5)),
                        const SizedBox(height: 4),
                        Text((m['phone'] ?? '').toString(), style: const TextStyle(color: AppColors.goldText, fontSize: 12, fontWeight: FontWeight.w600)),
                      ]),
                    ),
                  ]),
                );
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
        showToast(context, 'Message sent.');
        _messageCtrl.clear();
        ref.invalidate(_historyProvider);
      }
    } catch (e) {
      if (mounted) showToast(context, 'Could not send: $e', error: true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }
}

final _classesForMessagingProvider = FutureProvider.autoDispose((ref) => ref.read(dataRepoProvider).messageParentsClasses());
final _historyProvider = FutureProvider.autoDispose((ref) => ref.read(dataRepoProvider).messageParentsHistory());
