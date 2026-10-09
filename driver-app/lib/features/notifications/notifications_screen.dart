import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../models/app_notification.dart';
import '../../providers/data_providers.dart';
import '../../widgets/app_widgets.dart';

/// Alerts: emergency, route updates, schedule changes, parent messages, announcements.
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsProvider);
    return PortalPage(
      title: 'Notifications',
      body: async.when(
        loading: () => const SkeletonList(),
        error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(notificationsProvider)),
        data: (items) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(notificationsProvider),
          child: items.isEmpty
              ? ListView(children: const [SizedBox(height: 200), Center(child: Text('No notifications yet'))])
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _NotifTile(items[i]),
                ),
        ),
      ),
    );
  }
}

class _NotifTile extends StatelessWidget {
  final AppNotification n;
  const _NotifTile(this.n);

  @override
  Widget build(BuildContext context) {
    final emergency = n.kind == NotifKind.emergency;
    final (color, icon) = switch (n.kind) {
      NotifKind.emergency => (AppColors.danger, Icons.warning_amber_rounded),
      NotifKind.route => (AppColors.accentBlue, Icons.alt_route),
      NotifKind.schedule => (AppColors.primary, Icons.schedule),
      NotifKind.message => (AppColors.primary, Icons.message),
      NotifKind.announcement => (AppColors.textMuted, Icons.campaign),
    };

    return AppCard(
      color: emergency ? AppColors.danger : null,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: emergency ? Colors.white : color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(n.title,
                          style: TextStyle(fontWeight: FontWeight.w800, color: emergency ? Colors.white : AppColors.textDark)),
                    ),
                    Text(DateFormat.jm().format(n.createdAt),
                        style: TextStyle(fontSize: 11, color: emergency ? Colors.white70 : AppColors.textMuted)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(n.body, style: TextStyle(color: emergency ? Colors.white : AppColors.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
