import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/catalog.dart';
import '../../core/config.dart';
import '../../core/session.dart';
import '../../core/theme.dart';

/// A school page that isn't built natively yet: the real web page, already signed in
/// with this person's session and without the web's own menus (the app has them).
class WebPageScreen extends ConsumerStatefulWidget {
  final String title, path;
  final Portal portal;
  const WebPageScreen({super.key, required this.title, required this.path, required this.portal});
  @override
  ConsumerState<WebPageScreen> createState() => _WebPageScreenState();
}

class _WebPageScreenState extends ConsumerState<WebPageScreen> {
  WebViewController? _c;
  bool _handedOff = false;
  int _progress = 0;
  String? _error;

  /// localStorage the web app reads to know who is signed in (same keys as its login page).
  String _handoffJs(Session s, String target) {
    final items = <String, String?>{'tenant': jsonEncode({'subdomain': s.subdomain})};
    switch (widget.portal) {
      case Portal.admin:
        items.addAll({'auth_token': s.token, 'user': jsonEncode(s.user), 'active_portal': null});
        if (s.canTeach) items.addAll({'staff_token': s.staffToken, 'staff_info': jsonEncode(s.staffInfo ?? {}), 'can_teacher_portal': '1'});
        break;
      case Portal.staff:
        items.addAll({'staff_token': s.staffToken ?? s.token, 'staff_info': jsonEncode(s.staffInfo ?? s.user), 'active_portal': 'staff'});
        break;
      case Portal.student:
        items.addAll({'student_token': s.token, 'student_info': jsonEncode(s.user), 'active_portal': 'student'});
        break;
      case Portal.parent:
        items.addAll({'parent_token': s.token, 'parent_info': jsonEncode(s.user), 'active_portal': 'parent'});
        break;
    }
    final sets = items.entries.map((e) => e.value == null ? 'localStorage.removeItem(${jsonEncode(e.key)});' : 'localStorage.setItem(${jsonEncode(e.key)}, ${jsonEncode(e.value)});').join();
    return "try{$sets sessionStorage.setItem('sc_embed','1');}catch(e){} location.replace(${jsonEncode(target)});";
  }

  String _target() => widget.path.contains('?') ? '${widget.path}&embed=1' : '${widget.path}?embed=1';

  @override
  void initState() {
    super.initState();
    if (kIsWeb) return;
    final s = ref.read(sessionProvider).valueOrNull;
    if (s == null) return;
    final start = AppConfig.schoolWeb(s.subdomain, '/robots.txt');   // any same-site address, to set the session
    _c = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(C.bg)
      ..setNavigationDelegate(NavigationDelegate(
        onProgress: (p) => setState(() => _progress = p),
        onPageFinished: (_) async {
          if (_handedOff) return;
          _handedOff = true;
          await _c!.runJavaScript(_handoffJs(s, _target()));
        },
        onWebResourceError: (e) { if (e.isForMainFrame ?? true) setState(() => _error = e.description); },
        onNavigationRequest: (r) {
          final u = Uri.tryParse(r.url);
          if (u != null && (u.scheme == 'tel' || u.scheme == 'mailto' || u.scheme == 'whatsapp' || !u.host.endsWith(AppConfig.webDomain))) {
            launchUrl(u, mode: LaunchMode.externalApplication);
            return NavigationDecision.prevent;
          }
          return NavigationDecision.navigate;
        },
      ))
      ..loadRequest(start);
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(sessionProvider).valueOrNull;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          if (_c != null) IconButton(tooltip: 'Reload', icon: const Icon(Icons.refresh), onPressed: () { setState(() { _error = null; }); _c!.reload(); }),
          if (s != null) IconButton(tooltip: 'Open in browser', icon: const Icon(Icons.open_in_new), onPressed: () => launchUrl(AppConfig.schoolWeb(s.subdomain, widget.path), mode: LaunchMode.externalApplication)),
        ],
        bottom: _c != null && _progress < 100 ? PreferredSize(preferredSize: const Size.fromHeight(2), child: LinearProgressIndicator(value: _progress / 100, minHeight: 2, color: C.brand, backgroundColor: Colors.transparent)) : null,
      ),
      body: _c == null || s == null
          ? _OpenOutside(path: widget.path, subdomain: s?.subdomain ?? '')
          : _error != null
              ? _Problem(message: _error!, onRetry: () { setState(() => _error = null); _handedOff = false; _c!.loadRequest(AppConfig.schoolWeb(s.subdomain, '/robots.txt')); })
              : WebViewWidget(controller: _c!),
    );
  }
}

class _OpenOutside extends StatelessWidget {
  final String path, subdomain;
  const _OpenOutside({required this.path, required this.subdomain});
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.open_in_browser, size: 48, color: C.brand),
            const SizedBox(height: 12),
            const Text('This page opens in your browser here', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: C.slate800)),
            const SizedBox(height: 6),
            Text(path, style: const TextStyle(color: C.slate500)),
            const SizedBox(height: 16),
            FilledButton.icon(onPressed: subdomain.isEmpty ? null : () => launchUrl(AppConfig.schoolWeb(subdomain, path)), icon: const Icon(Icons.open_in_new), label: const Text('Open page')),
          ]),
        ),
      );
}

class _Problem extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _Problem({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.wifi_off, size: 44, color: C.slate400),
            const SizedBox(height: 10),
            const Text("Couldn't load this page", style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: C.slate800)),
            const SizedBox(height: 4),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: C.slate500)),
            const SizedBox(height: 14),
            OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Try again')),
          ]),
        ),
      );
}
