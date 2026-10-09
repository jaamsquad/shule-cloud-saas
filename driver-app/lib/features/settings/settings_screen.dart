import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/settings_provider.dart';
import '../../widgets/app_widgets.dart';

/// Settings: profile, dark mode, language, permissions, privacy, logout.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driver = ref.watch(authControllerProvider).driver;
    final settings = ref.watch(settingsControllerProvider);
    final sc = ref.read(settingsControllerProvider.notifier);

    return PortalPage(
      title: 'Settings',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          AppCard(
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                  backgroundImage: driver?.photoUrl != null ? NetworkImage(driver!.photoUrl!) : null,
                  child: driver?.photoUrl == null ? const Icon(Icons.person, color: AppColors.primary) : null,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(driver?.name ?? 'Driver', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                      Text('${driver?.busPlate ?? 'Bus'} • ${driver?.routeName ?? 'Route'}', style: const TextStyle(color: AppColors.textMuted)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const _SectionLabel('PREFERENCES'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.dark_mode_outlined),
                  title: const Text('Dark Mode'),
                  value: settings.themeMode == ThemeMode.dark,
                  onChanged: sc.toggleDark,
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.language),
                  title: const Text('Language'),
                  subtitle: Text(settings.language == 'sw' ? 'Kiswahili' : 'English'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _pickLanguage(context, sc, settings.language),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  secondary: const Icon(Icons.checklist),
                  title: const Text('Require inspection before trip'),
                  value: settings.inspectionRequired,
                  onChanged: sc.setInspectionRequired,
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.how_to_reg_outlined),
                  title: const Text('Boarding method'),
                  subtitle: Text(settings.scanBoarding ? 'Scan student card' : 'Pick from list'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _pickBoardingMode(context, sc, settings.boardingMode),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const _SectionLabel('SECURITY & PRIVACY'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.location_on_outlined),
                  title: const Text('Location Permissions'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => openAppSettings(),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.privacy_tip_outlined),
                  title: const Text('Privacy Policy'),
                  trailing: const Icon(Icons.open_in_new),
                  onTap: () {},
                ),
                const Divider(height: 1),
                const ListTile(leading: Icon(Icons.info_outline), title: Text('About'), subtitle: Text('ShuleCloud Driver v1.0.0')),
              ],
            ),
          ),
          const SizedBox(height: 16),
          AppCard(
            child: TextButton.icon(
              style: TextButton.styleFrom(foregroundColor: AppColors.danger),
              onPressed: () async {
                await ref.read(authControllerProvider.notifier).logout();
                if (context.mounted) context.go('/login');
              },
              icon: const Icon(Icons.logout),
              label: const Text('Logout'),
            ),
          ),
          const SizedBox(height: 24),
          const Center(child: Text('© 2026 ShuleCloud Fleet Systems', style: TextStyle(color: AppColors.textMuted, fontSize: 12))),
        ],
      ),
    );
  }

  void _pickLanguage(BuildContext context, SettingsController sc, String current) {
    showModalBottomSheet(
      context: context,
      builder: (_) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final e in {'en': 'English', 'sw': 'Kiswahili'}.entries)
            RadioListTile<String>(
              value: e.key,
              groupValue: current,
              title: Text(e.value),
              onChanged: (v) {
                if (v != null) sc.setLanguage(v);
                Navigator.pop(context);
              },
            ),
        ],
      ),
    );
  }

  void _pickBoardingMode(BuildContext context, SettingsController sc, String current) {
    showModalBottomSheet(
      context: context,
      builder: (_) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          RadioListTile<String>(
            value: 'scan', groupValue: current,
            title: const Text('Scan student card'),
            subtitle: const Text('Board/Drop by scanning the QR/barcode'),
            onChanged: (v) { if (v != null) sc.setBoardingMode(v); Navigator.pop(context); },
          ),
          RadioListTile<String>(
            value: 'list', groupValue: current,
            title: const Text('Pick from list'),
            subtitle: const Text('Board/Drop from the student list'),
            onChanged: (v) { if (v != null) sc.setBoardingMode(v); Navigator.pop(context); },
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(left: 4, bottom: 8),
        child: Text(text, style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w700, fontSize: 12, letterSpacing: 0.5)),
      );
}
