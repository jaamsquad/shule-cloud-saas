import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/app_icon.dart';
import '../../core/catalog.dart';
import '../../core/config.dart';
import '../../core/session.dart';
import '../../core/theme.dart';

/// A school page that isn't built natively yet: the real web page, already signed in
/// with this person's session and without the web's own menus (the app has them).
/// The sign-in happens on a blank start page at the school's address, behind an
/// "Opening…" screen, so nothing but the finished page is ever shown.
class WebPageScreen extends ConsumerStatefulWidget {
  final String title, path;
  final Portal portal;
  const WebPageScreen({super.key, required this.title, required this.path, required this.portal});
  @override
  ConsumerState<WebPageScreen> createState() => _WebPageScreenState();
}

class _WebPageScreenState extends ConsumerState<WebPageScreen> {
  WebViewController? _c;
  bool _ready = false;
  int _progress = 0;
  String? _error;
  Timer? _giveUp;

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

  /// A blank page served "from" the school's address so the sign-in lands on the right site.
  String _startPage(Session s) => '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">'
      '<style>html,body{margin:0;background:#F8FAFC}</style></head><body><script>${_handoffJs(s, _target())}</script></body></html>';

  void _start(Session s) {
    setState(() { _ready = false; _error = null; _progress = 0; });
    _giveUp?.cancel();
    // never leave someone staring at the loader if the page is slow to say it has finished
    _giveUp = Timer(const Duration(seconds: 20), () { if (mounted) setState(() => _ready = true); });
    _c!.loadHtmlString(_startPage(s), baseUrl: AppConfig.schoolWeb(s.subdomain, '/').toString());
  }

  String _target() => widget.path.contains('?') ? '${widget.path}&embed=1' : '${widget.path}?embed=1';

  @override
  void initState() {
    super.initState();
    if (kIsWeb) return;
    final s = ref.read(sessionProvider).valueOrNull;
    if (s == null) return;
    _c = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(C.bg)
      ..setNavigationDelegate(NavigationDelegate(
        onProgress: (p) { if (mounted) setState(() => _progress = p); },
        onPageFinished: (url) {
          // the start page finishes first; the school page is the one carrying embed=1
          if (url.contains('embed=1') && mounted) { _giveUp?.cancel(); setState(() => _ready = true); }
        },
        onWebResourceError: (e) { if ((e.isForMainFrame ?? true) && mounted) setState(() => _error = e.description); },
        onNavigationRequest: (r) {
          final u = Uri.tryParse(r.url);
          if (u != null && (u.scheme == 'tel' || u.scheme == 'mailto' || u.scheme == 'whatsapp' || !u.host.endsWith(AppConfig.webDomain))) {
            launchUrl(u, mode: LaunchMode.externalApplication);
            return NavigationDecision.prevent;
          }
          return NavigationDecision.navigate;
        },
      ));
    _start(s);
  }

  @override
  void dispose() { _giveUp?.cancel(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(sessionProvider).valueOrNull;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          if (_c != null && s != null) IconButton(tooltip: 'Reload', icon: const Icon(Icons.refresh_rounded), onPressed: () => _ready ? _c!.reload() : _start(s)),
          if (s != null) IconButton(tooltip: 'Open in browser', icon: const Icon(Icons.open_in_new_rounded), onPressed: () => launchUrl(AppConfig.schoolWeb(s.subdomain, widget.path), mode: LaunchMode.externalApplication)),
        ],
        bottom: _c != null && _ready && _progress < 100 ? PreferredSize(preferredSize: const Size.fromHeight(2), child: LinearProgressIndicator(value: _progress / 100, minHeight: 2, color: C.brand, backgroundColor: Colors.transparent)) : null,
      ),
      body: _c == null || s == null
          ? _OpenOutside(title: widget.title, path: widget.path, subdomain: s?.subdomain ?? '')
          : _error != null
              ? _Problem(message: _error!, onRetry: () => _start(s))
              : Stack(children: [
                  // kept invisible until the school page is ready, so the start page never shows
                  Opacity(opacity: _ready ? 1 : 0, child: WebViewWidget(controller: _c!)),
                  IgnorePointer(
                    ignoring: _ready,
                    child: AnimatedOpacity(
                      opacity: _ready ? 0 : 1, duration: const Duration(milliseconds: 300),
                      child: _Opening(title: widget.title, progress: _progress),
                    ),
                  ),
                ]),
    );
  }
}

/// Shown while the page signs in and loads.
class _Opening extends StatefulWidget {
  final String title;
  final int progress;
  const _Opening({required this.title, required this.progress});
  @override
  State<_Opening> createState() => _OpeningState();
}

class _OpeningState extends State<_Opening> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))..repeat(reverse: true);
  @override
  void dispose() { _pulse.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Container(
        color: C.bg,
        alignment: Alignment.center,
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ScaleTransition(
            scale: Tween(begin: 0.92, end: 1.04).animate(CurvedAnimation(parent: _pulse, curve: Curves.easeInOut)),
            child: AppIcon(icon: pageIcon(widget.title), color: C.brand, size: 72),
          ),
          const SizedBox(height: 22),
          Text('Opening ${widget.title}', textAlign: TextAlign.center, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: C.ink)),
          const SizedBox(height: 6),
          const Text('Signing you in securely…', style: TextStyle(color: C.slate500, fontSize: 13)),
          const SizedBox(height: 20),
          SizedBox(
            width: 180,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: widget.progress <= 5 ? null : widget.progress / 100, minHeight: 5,
                color: C.brand, backgroundColor: C.brand.withValues(alpha: 0.12),
              ),
            ),
          ),
        ]),
      );
}

class _OpenOutside extends StatelessWidget {
  final String title, path, subdomain;
  const _OpenOutside({required this.title, required this.path, required this.subdomain});
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            AppIcon(icon: pageIcon(title), color: C.brand, size: 72),
            const SizedBox(height: 20),
            Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: C.ink)),
            const SizedBox(height: 6),
            const Text('This page opens on the school website.', textAlign: TextAlign.center, style: TextStyle(color: C.slate500)),
            const SizedBox(height: 20),
            FilledButton.icon(onPressed: subdomain.isEmpty ? null : () => launchUrl(AppConfig.schoolWeb(subdomain, path)), icon: const Icon(Icons.open_in_new_rounded), label: const Text('Open page')),
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
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 76, height: 76,
              decoration: BoxDecoration(color: const Color(0xFFFFF1F2), borderRadius: BorderRadius.circular(24)),
              child: const Icon(Icons.wifi_off_rounded, size: 36, color: C.red),
            ),
            const SizedBox(height: 18),
            const Text("Couldn't open this page", style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: C.ink)),
            const SizedBox(height: 6),
            const Text('Check your internet connection and try again.', textAlign: TextAlign.center, style: TextStyle(color: C.slate500)),
            const SizedBox(height: 4),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: C.slate400, fontSize: 12)),
            const SizedBox(height: 20),
            FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: const Text('Try again')),
          ]),
        ),
      );
}
