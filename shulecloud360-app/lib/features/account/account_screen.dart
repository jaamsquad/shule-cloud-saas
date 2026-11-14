import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/catalog.dart';
import '../../core/config.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/ui.dart';
import '../../core/widgets.dart';
import '../notifications/notifications_screen.dart';
import '../shell/app_shell.dart';

/// Account & settings: who you are, your school, security, help and log out.
class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(sessionProvider).valueOrNull;
    final apps = ref.watch(appsProvider).valueOrNull ?? const <AppDef>[];
    if (s == null) return const SizedBox.shrink();
    Widget tile(IconData i, String t, String? sub, VoidCallback onTap, {Color? color}) => ListTile(
          leading: Icon(i, color: color ?? C.slate600), title: Text(t, style: TextStyle(fontWeight: FontWeight.w600, color: color ?? C.slate800)),
          subtitle: sub == null ? null : Text(sub, style: const TextStyle(color: C.slate500, fontSize: 12.5)), trailing: const Icon(Icons.chevron_right, color: C.slate400), onTap: onTap);
    final securityPortal = s.kind == UserKind.admin ? Portal.admin : s.kind == UserKind.teacher ? Portal.staff : null;
    final unread = ref.watch(unreadProvider).valueOrNull ?? 0;
    return ListView(padding: EdgeInsets.zero, children: [
      CurvedHeader(title: 'My Account', unread: unread, onBell: () => context.push('/notifications')),
      Padding(padding: const EdgeInsets.fromLTRB(16, 16, 16, 24), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Panel(
        child: Row(children: [
          Avatar(name: s.name, size: 58),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(s.name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: C.ink)),
            const SizedBox(height: 2),
            Text('${s.kind == UserKind.admin ? s.role.replaceAll('_', ' ') : s.kind.name} · ${s.subdomain}', style: const TextStyle(color: C.slate500)),
            const SizedBox(height: 6),
            Text('${apps.where((a) => !a.locked).length} app${apps.length == 1 ? '' : 's'} available', style: const TextStyle(color: C.brandDark, fontWeight: FontWeight.w600, fontSize: 12.5)),
          ])),
        ]),
      ),
      const SizedBox(height: 14),
      Panel(padding: EdgeInsets.zero, child: Column(children: [
        if (securityPortal != null)
          tile(Icons.verified_user_outlined, 'Sign-in & security', 'Two-step sign-in, link Google', () => context.push(Uri(path: '/open', queryParameters: {
                'portal': securityPortal.name, 'path': securityPortal == Portal.admin ? '/settings/account' : '/', 'title': 'Sign-in & security'}).toString())),
        tile(Icons.refresh, 'Refresh my apps', 'After the school changes your role', () async {
          await ref.read(sessionProvider.notifier).refreshPermissions();
          if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Your apps are up to date.')));
        }),
        tile(Icons.public, 'Open school website', '${s.subdomain}.${AppConfig.webDomain}', () => launchUrl(AppConfig.schoolWeb(s.subdomain), mode: LaunchMode.externalApplication)),
        tile(Icons.help_outline, 'Help', 'Support and how to', () => context.push('/help')),
      ])),
      const SizedBox(height: 14),
      Panel(padding: EdgeInsets.zero, child: tile(Icons.logout, 'Log out', null, () => confirmLogout(context, ref), color: C.red)),
      const SizedBox(height: 18),
      const Center(child: Text('ShuleCloud 360 · v1.0.0', style: TextStyle(color: C.slate400, fontSize: 12))),
      ])),
    ]);
  }
}

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Help')),
        body: ListView(padding: const EdgeInsets.all(16), children: [
          const Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Finding your way', style: TextStyle(fontWeight: FontWeight.w700, color: C.ink)),
            SizedBox(height: 4),
            Text('Dashboard lists every app your account can use. Star an app to keep it on Home. The menu (top left) shows the pages of the app you are in.', style: TextStyle(color: C.slate600)),
          ])),
          const SizedBox(height: 10),
          const Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Missing an app?', style: TextStyle(fontWeight: FontWeight.w700, color: C.ink)),
            SizedBox(height: 4),
            Text('Apps follow your role. Ask the school administrator to grant it in Roles & Permissions, then tap Account → Refresh my apps.', style: TextStyle(color: C.slate600)),
          ])),
          const SizedBox(height: 10),
          Panel(padding: EdgeInsets.zero, child: Column(children: [
            ListTile(leading: const Icon(Icons.call_outlined, color: C.iconInk), title: const Text('Call support'), subtitle: const Text('0726 151 104'), onTap: () => launchUrl(Uri.parse('tel:${AppConfig.supportPhone}'))),
            ListTile(leading: const Icon(Icons.mail_outline, color: C.iconInk), title: const Text('Email'), subtitle: const Text(AppConfig.supportEmail), onTap: () => launchUrl(Uri.parse('mailto:${AppConfig.supportEmail}'))),
          ])),
        ]),
      );
}
