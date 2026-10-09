import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_providers.dart';
import '../../providers/settings_provider.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/google_widgets.dart';
import '../dashboard/dashboard_screen.dart';
import '../shell/app_shell.dart';

// ── Announcements ────────────────────────────────────────────────────────────
class AlertsScreen extends ConsumerWidget {
  const AlertsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(announcementsProvider);
    return PortalPage(
      title: 'Announcements',
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(announcementsProvider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(announcementsProvider)),
          data: (list) => list.isEmpty
              ? const ErrorView(message: "You're all caught up.", icon: Icons.notifications_none)
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final a = list[i];
                    return PanelCard(
                      title: a.title,
                      icon: Icons.campaign_outlined,
                      action: a.createdAt == null
                          ? null
                          : Text(DateFormat('d MMM y').format(a.createdAt!.toLocal()),
                              style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w700)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(a.body.isEmpty ? '—' : a.body, style: const TextStyle(color: AppColors.slate700, fontSize: 13.5, height: 1.5)),
                        const SizedBox(height: 8),
                        StatusPill(label: 'To: ${a.audience}', color: AppColors.teal),
                      ]),
                    );
                  },
                ),
        ),
      ),
    );
  }
}

// ── QR/Barcode Scan (attendance quick-mark, library) ────────────────────────
class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});
  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final MobileScannerController _controller = MobileScannerController();
  String? _lastCode;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PortalPage(
      title: 'Scan Card',
      subtitle: 'Student QR / barcode',
      actions: [
        IconButton(
          tooltip: 'Torch',
          onPressed: () => _controller.toggleTorch(),
          icon: const Icon(Icons.flash_on, color: AppColors.slate600),
        ),
      ],
      body: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          child: Stack(children: [
            MobileScanner(
              controller: _controller,
              onDetect: (capture) {
                final codes = capture.barcodes;
                if (codes.isEmpty) return;
                final v = codes.first.rawValue;
                if (v != null && v != _lastCode) {
                  setState(() => _lastCode = v);
                  showToast(context, 'Scanned: $v');
                }
              },
            ),
            Center(
              child: Container(
                width: 220,
                height: 220,
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.gold, width: 3),
                  borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 20,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.65), borderRadius: BorderRadius.circular(AppTheme.radius)),
                  child: Text(_lastCode == null ? 'Point at a student QR/barcode' : 'Last: $_lastCode',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

// ── Profile ──────────────────────────────────────────────────────────────────
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final staff = ref.watch(authControllerProvider).staff;
    return PortalPage(
      title: 'My Profile',
      body: staff == null
          ? const ErrorView(message: 'Not signed in.', icon: Icons.person_off)
          : ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: [
              StaffInfoPanel(staff: staff),
              const SizedBox(height: 16),
              const GoogleLinkPanel(),
              const SizedBox(height: 16),
              PanelCard(
                title: 'Account',
                icon: Icons.manage_accounts_outlined,
                padding: EdgeInsets.zero,
                child: Column(children: [
                  _LinkTile(icon: Icons.badge_outlined, label: 'Portal Username', trailing: staff.portalUsername.isEmpty ? '—' : staff.portalUsername),
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
          title: 'Appearance & Security',
          icon: Icons.tune,
          padding: EdgeInsets.zero,
          child: Column(children: [
            _switch(Icons.dark_mode_outlined, 'Dark Mode', null, s.themeMode == ThemeMode.dark, sc.toggleDark),
            const Divider(),
            _switch(Icons.fingerprint, 'Biometric Login', 'Use FaceID or Fingerprint', s.biometric, sc.setBiometric),
          ]),
        ),
        const SizedBox(height: 16),
        const GoogleLinkPanel(),
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
                applicationName: 'ShuleCloud Teacher',
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

  Widget _switch(IconData icon, String title, String? subtitle, bool value, ValueChanged<bool> onChanged) => SwitchListTile(
        secondary: Icon(icon, color: AppColors.teal),
        title: Text(title, style: const TextStyle(color: AppColors.slate800, fontWeight: FontWeight.w700, fontSize: 14)),
        subtitle: subtitle == null ? null : Text(subtitle, style: const TextStyle(color: AppColors.slate500, fontSize: 12.5)),
        value: value,
        onChanged: onChanged,
      );
}

class _LinkTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? trailing;
  final bool external;
  final Color color;
  final VoidCallback? onTap;
  const _LinkTile({required this.icon, required this.label, this.trailing, this.external = false, this.color = AppColors.teal, this.onTap});

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
                  style: TextStyle(color: color == AppColors.teal ? AppColors.slate800 : color, fontWeight: FontWeight.w700, fontSize: 14)),
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
