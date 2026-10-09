import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/settings_provider.dart';
import '../../widgets/app_widgets.dart';
import '../dashboard/dashboard_screen.dart';
import '../shell/app_shell.dart';

// ── Personal profile ─────────────────────────────────────────────────────────
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(authControllerProvider).student;
    return PortalPage(
      title: 'Personal Profile',
      body: s == null
          ? const ErrorView(message: 'Not signed in.', icon: Icons.person_off)
          : ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: [
              StudentInfoPanel(student: s),
              const SizedBox(height: 16),
              PanelCard(
                title: 'Account',
                icon: Icons.manage_accounts_outlined,
                padding: EdgeInsets.zero,
                child: Column(children: [
                  _LinkTile(icon: Icons.badge_outlined, label: 'Portal Username', trailing: s.portalUsername.isEmpty ? '—' : s.portalUsername),
                  const Divider(),
                  _LinkTile(icon: Icons.settings_outlined, label: 'Settings', onTap: () => context.push('/settings')),
                  const Divider(),
                  _LinkTile(icon: Icons.logout, label: 'Logout', color: AppColors.error, onTap: () => confirmLogout(context, ref)),
                ]),
              ),
            ]),
    );
  }
}

// ── Settings ─────────────────────────────────────────────────────────────────
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(settingsControllerProvider);
    final sc = ref.read(settingsControllerProvider.notifier);
    return PortalPage(
      title: 'Settings',
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: [
        PanelCard(
          title: 'Appearance',
          icon: Icons.tune,
          padding: EdgeInsets.zero,
          child: SwitchListTile(
            secondary: const Icon(Icons.dark_mode_outlined, color: AppColors.accent),
            title: const Text('Dark Mode', style: TextStyle(color: AppColors.slate800, fontWeight: FontWeight.w700, fontSize: 14)),
            value: s.themeMode == ThemeMode.dark,
            onChanged: sc.toggleDark,
          ),
        ),
        const SizedBox(height: 16),
        PanelCard(
          title: 'Support',
          icon: Icons.support_agent,
          padding: EdgeInsets.zero,
          child: Column(children: [
            _LinkTile(
              icon: Icons.help_outline,
              label: 'Help Center',
              external: true,
              onTap: () => launchUrl(Uri.parse('https://shulecloud.com'), mode: LaunchMode.externalApplication),
            ),
            const Divider(),
            _LinkTile(
              icon: Icons.privacy_tip_outlined,
              label: 'Privacy',
              external: true,
              onTap: () => launchUrl(Uri.parse('https://shulecloud.com/privacy'), mode: LaunchMode.externalApplication),
            ),
            const Divider(),
            _LinkTile(
              icon: Icons.info_outline,
              label: 'About',
              trailing: 'v1.0.0',
              onTap: () => showAboutDialog(
                context: context,
                applicationName: 'ShuleCloud Student',
                applicationVersion: '1.0.0',
                applicationLegalese: '© 2026 ShuleCloud · Empowering education through technology.',
              ),
            ),
          ]),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(foregroundColor: AppColors.error, side: const BorderSide(color: Color(0xFFFECDD3))),
          onPressed: () => confirmLogout(context, ref),
          icon: const Icon(Icons.logout, size: 18),
          label: const Text('Logout'),
        ),
        const SizedBox(height: 16),
        const Center(
          child: Text('POWERED BY SHULECLOUD ERP',
              style: TextStyle(color: AppColors.slate400, fontSize: 10, letterSpacing: 1.4, fontWeight: FontWeight.w800)),
        ),
      ]),
    );
  }
}

class _LinkTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? trailing;
  final bool external;
  final Color color;
  final VoidCallback? onTap;
  const _LinkTile({required this.icon, required this.label, this.trailing, this.external = false, this.color = AppColors.accent, this.onTap});

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 14),
            Expanded(
              child: Text(label,
                  style: TextStyle(color: color == AppColors.accent ? AppColors.slate800 : color, fontWeight: FontWeight.w700, fontSize: 14)),
            ),
            if (trailing != null) Text(trailing!, style: const TextStyle(color: AppColors.goldText, fontWeight: FontWeight.w700, fontSize: 13)),
            if (onTap != null) ...[
              const SizedBox(width: 6),
              Icon(external ? Icons.open_in_new : Icons.chevron_right, color: AppColors.slate400, size: 18),
            ],
          ]),
        ),
      );
}
