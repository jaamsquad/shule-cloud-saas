import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_providers.dart';
import '../../providers/providers.dart';
import '../../providers/settings_provider.dart';
import '../../widgets/app_widgets.dart';

// ── Alerts / Notifications ───────────────────────────────────────────────────
class AlertsScreen extends ConsumerWidget {
  const AlertsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(announcementsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Alerts & Announcements')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(announcementsProvider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(announcementsProvider)),
          data: (list) => list.isEmpty
              ? const ErrorView(message: "You're all caught up.", icon: Icons.notifications_none)
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final a = list[i];
                    return AppCard(child: Row(children: [
                      const Icon(Icons.campaign_outlined, color: AppColors.primary), const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(a.title, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.onSurface)),
                        if (a.body.isNotEmpty) Text(a.body, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13)),
                      ])),
                    ]));
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
  void dispose() { _controller.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan'), actions: [
        IconButton(onPressed: () => _controller.toggleTorch(), icon: const Icon(Icons.flash_on)),
      ]),
      body: Stack(children: [
        MobileScanner(
          controller: _controller,
          onDetect: (capture) {
            final codes = capture.barcodes;
            if (codes.isEmpty) return;
            final v = codes.first.rawValue;
            if (v != null && v != _lastCode) {
              setState(() => _lastCode = v);
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Scanned: $v'), backgroundColor: AppColors.secondary));
            }
          },
        ),
        Positioned(
          left: 0, right: 0, bottom: 24,
          child: Center(child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(999)),
            child: Text(_lastCode == null ? 'Point at a student QR/barcode' : 'Last: $_lastCode', style: const TextStyle(color: Colors.white)),
          )),
        ),
      ]),
    );
  }
}

// ── Profile ──────────────────────────────────────────────────────────────────
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final staff = auth.staff;
    return Scaffold(
      appBar: AppBar(title: const Text('Profile'), actions: [
        IconButton(onPressed: () => context.push('/settings'), icon: const Icon(Icons.settings)),
      ]),
      body: staff == null
          ? const ErrorView(message: 'Not signed in.', icon: Icons.person_off)
          : ListView(padding: const EdgeInsets.all(16), children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryContainer]), borderRadius: BorderRadius.circular(20)),
                child: Column(children: [
                  CircleAvatar(radius: 44, backgroundColor: Colors.white,
                      backgroundImage: staff.photoUrl != null ? NetworkImage(staff.photoUrl!) : null,
                      child: staff.photoUrl == null ? const Icon(Icons.person, size: 44, color: AppColors.primary) : null),
                  const SizedBox(height: 12),
                  Text(staff.name, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                  Text('ID: ${staff.portalUsername}', style: const TextStyle(color: Colors.white70)),
                  const SizedBox(height: 4),
                  Text(staff.designation, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                ]),
              ),
              const SizedBox(height: 16),
              _row(Icons.email_outlined, 'Email', staff.email.isEmpty ? '—' : staff.email),
              _row(Icons.phone_outlined, 'Phone', staff.phone.isEmpty ? '—' : staff.phone),
              const SizedBox(height: 12),
              OutlinedButton.icon(onPressed: () => context.push('/settings'), icon: const Icon(Icons.settings), label: const Text('Settings')),
            ]),
    );
  }

  Widget _row(IconData i, String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: AppCard(child: Row(children: [
          Icon(i, color: AppColors.primary), const SizedBox(width: 12),
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.onSurface))),
          Text(value, style: const TextStyle(color: AppColors.onSurfaceVariant, fontWeight: FontWeight.w700)),
        ])),
      );
}

// ── Settings ─────────────────────────────────────────────────────────────────
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(settingsControllerProvider);
    final sc = ref.read(settingsControllerProvider.notifier);
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const SectionHeader('Appearance'),
        AppCard(padding: EdgeInsets.zero, child: Column(children: [
          SwitchListTile(
              secondary: const Icon(Icons.dark_mode_outlined, color: AppColors.primary),
              title: const Text('Dark Mode', style: TextStyle(color: AppColors.onSurface, fontWeight: FontWeight.w600)),
              value: s.themeMode == ThemeMode.dark, onChanged: sc.toggleDark, activeColor: AppColors.primary),
          const Divider(height: 1, color: AppColors.outlineVariant),
          SwitchListTile(
              secondary: const Icon(Icons.fingerprint, color: AppColors.primary),
              title: const Text('Biometric Login', style: TextStyle(color: AppColors.onSurface, fontWeight: FontWeight.w600)),
              subtitle: const Text('Use FaceID or Fingerprint', style: TextStyle(color: AppColors.onSurfaceVariant)),
              value: s.biometric, onChanged: sc.setBiometric, activeColor: AppColors.primary),
        ])),
        const SizedBox(height: 16),
        const SectionHeader('Support'),
        AppCard(padding: EdgeInsets.zero, child: Column(children: [
          ListTile(
              leading: const Icon(Icons.help_outline, color: AppColors.primary),
              title: const Text('Help Center', style: TextStyle(color: AppColors.onSurface, fontWeight: FontWeight.w600)),
              trailing: const Icon(Icons.open_in_new, color: AppColors.onSurfaceVariant),
              onTap: () => launchUrl(Uri.parse('https://shulecloud.com'), mode: LaunchMode.externalApplication)),
          const Divider(height: 1, color: AppColors.outlineVariant),
          ListTile(
              leading: const Icon(Icons.privacy_tip_outlined, color: AppColors.primary),
              title: const Text('Privacy', style: TextStyle(color: AppColors.onSurface, fontWeight: FontWeight.w600)),
              trailing: const Icon(Icons.open_in_new, color: AppColors.onSurfaceVariant),
              onTap: () => launchUrl(Uri.parse('https://shulecloud.com/privacy'), mode: LaunchMode.externalApplication)),
          const Divider(height: 1, color: AppColors.outlineVariant),
          ListTile(
              leading: const Icon(Icons.info_outline, color: AppColors.primary),
              title: const Text('About', style: TextStyle(color: AppColors.onSurface, fontWeight: FontWeight.w600)),
              subtitle: const Text('ShuleCloud Teacher v1.0.0', style: TextStyle(color: AppColors.onSurfaceVariant)),
              trailing: const Icon(Icons.chevron_right, color: AppColors.onSurfaceVariant),
              onTap: () => showAboutDialog(context: context, applicationName: 'ShuleCloud Teacher', applicationVersion: '1.0.0',
                  applicationLegalese: '© 2026 ShuleCloud · Empowering education through technology.')),
        ])),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(foregroundColor: AppColors.error, side: const BorderSide(color: AppColors.error)),
          onPressed: () async { await ref.read(authControllerProvider.notifier).logout(); if (context.mounted) context.go('/login'); },
          icon: const Icon(Icons.logout), label: const Text('Logout'),
        ),
        const SizedBox(height: 16),
        const Center(child: Text('ShuleCloud Teacher v1.0.0 · Built for Excellence', style: TextStyle(color: AppColors.outline, fontSize: 12))),
      ]),
    );
  }
}
