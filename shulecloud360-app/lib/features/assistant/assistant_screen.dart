import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/ui.dart';

/// Whether the AI assistant is available (set up by ShuleCloud, on for this school).
class AiStatus {
  final bool platform, school, canManage;
  final String model;
  final List<String> suggestions;
  const AiStatus({this.platform = false, this.school = false, this.canManage = false, this.model = '', this.suggestions = const []});
  bool get enabled => platform && school;
  factory AiStatus.fromJson(Map j) => AiStatus(
        platform: j['platform'] == true, school: j['school'] == true, canManage: j['canManage'] == true,
        model: (j['model'] ?? '').toString(), suggestions: List<String>.from(j['suggestions'] ?? const []),
      );
}

final aiStatusProvider = FutureProvider.autoDispose<AiStatus>((ref) async {
  final s = ref.watch(sessionProvider).valueOrNull;
  if (s == null) return const AiStatus();
  try {
    return AiStatus.fromJson((await ref.read(apiProvider).get('/assistant/ai/status')).data as Map);
  } catch (_) {
    return const AiStatus();
  }
});

class _Msg {
  final bool mine, error;
  final String text;
  final List<Map> cards;
  const _Msg(this.text, {this.mine = false, this.error = false, this.cards = const []});
}

/// Chat with the school's AI assistant: type anything or tap a suggestion.
class AssistantScreen extends ConsumerStatefulWidget {
  const AssistantScreen({super.key});
  @override
  ConsumerState<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends ConsumerState<AssistantScreen> {
  final _text = TextEditingController();
  final _scroll = ScrollController();
  final List<_Msg> _msgs = [];
  bool _busy = false;

  @override
  void dispose() { _text.dispose(); _scroll.dispose(); super.dispose(); }

  void _toEnd() => WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
      });

  Future<void> _send([String? q]) async {
    final text = (q ?? _text.text).trim();
    if (text.isEmpty || _busy) return;
    setState(() { _msgs.add(_Msg(text, mine: true)); _busy = true; _text.clear(); });
    _toEnd();
    try {
      final history = _msgs.where((m) => !m.error).map((m) => {'role': m.mine ? 'user' : 'assistant', 'content': m.text}).toList();
      final d = (await ref.read(apiProvider).post('/assistant/ai/chat', data: {'messages': history})).data as Map;
      setState(() => _msgs.add(_Msg((d['reply'] ?? '').toString(), cards: List<Map>.from((d['cards'] ?? const []) as List))));
    } on DioException catch (e) {
      setState(() => _msgs.add(_Msg(errorText(e, 'The assistant could not answer. Try again.'), error: true)));
    } catch (_) {
      setState(() => _msgs.add(const _Msg('The assistant could not answer. Try again.', error: true)));
    } finally {
      if (mounted) setState(() => _busy = false);
      _toEnd();
    }
  }

  Future<void> _setSchool(bool on) async {
    try {
      final d = (await ref.read(apiProvider).post('/assistant/ai/school', data: {'enabled': on})).data as Map;
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text((d['message'] ?? 'Saved').toString())));
      ref.invalidate(aiStatusProvider);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(e, 'Could not change it.'))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final st = ref.watch(aiStatusProvider);
    return Scaffold(
      body: Column(children: [
        CurvedHeader(
          title: 'AI Assistant', back: true, trailingIcon: Icons.refresh_rounded,
          onBell: _msgs.isEmpty ? null : () => setState(_msgs.clear),   // new chat
          below: Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: Row(children: [
              const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 16), const SizedBox(width: 6),
              Expanded(child: Text(st.valueOrNull?.enabled == true ? 'Ask anything — school numbers, SMS drafts, lesson ideas' : 'ShuleCloud Assistant',
                  maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 12.5, fontWeight: FontWeight.w600))),
              if (st.valueOrNull?.canManage == true && st.valueOrNull?.enabled == true)
                InkWell(
                  onTap: () => showDialog<void>(context: context, builder: (c) => AlertDialog(
                    title: const Text('Turn off AI for the school?'),
                    content: const Text('Nobody in your school will be able to use the assistant until you turn it back on.'),
                    actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('Cancel')), FilledButton(onPressed: () { Navigator.pop(c); _setSchool(false); }, child: const Text('Turn off'))],
                  )),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(20)),
                    child: const Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.power_settings_new_rounded, size: 14, color: Colors.white), SizedBox(width: 4),
                      Text('School: on', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w800)),
                    ]),
                  ),
                ),
            ]),
          ),
        ),
        Expanded(
          child: st.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, __) => const _Notice(icon: Icons.wifi_off_rounded, title: 'Could not reach the assistant'),
            data: (ai) {
              if (!ai.platform) return const _Notice(icon: Icons.auto_awesome_outlined, title: 'AI assistant not set up yet', hint: 'ShuleCloud adds the AI in the owner portal. Call 0726151104 to have it turned on.');
              if (!ai.school) {
                return _Notice(icon: Icons.power_settings_new_rounded, title: 'AI is turned off for your school',
                    hint: ai.canManage ? null : 'Your school administrator can turn it on.',
                    action: ai.canManage ? FilledButton.icon(onPressed: () => _setSchool(true), icon: const Icon(Icons.power_settings_new_rounded), label: const Text('Turn on for the school')) : null);
              }
              return ListView(controller: _scroll, padding: const EdgeInsets.fromLTRB(16, 16, 16, 16), children: [
                if (_msgs.isEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: C.iconSoft, borderRadius: BorderRadius.circular(18), border: Border.all(color: C.slate200)),
                    child: const Row(children: [
                      DuoIcon(icon: Icons.smart_toy_outlined, color: C.blue, size: 38),
                      SizedBox(width: 12),
                      Expanded(child: Text('Hi! I can look up your school\'s numbers, draft SMS and notices, plan lessons and explain how to do things in ShuleCloud.',
                          style: TextStyle(fontSize: 13.5, height: 1.4, color: C.slate700, fontWeight: FontWeight.w600))),
                    ]),
                  ),
                  const Heading('Try one of these'),
                  for (final q in ai.suggestions)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Material(
                        color: Colors.white, borderRadius: BorderRadius.circular(14),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(14), onTap: () => _send(q),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: C.slate200)),
                            child: Row(children: [
                              const Icon(Icons.auto_awesome_outlined, size: 16, color: C.iconInk), const SizedBox(width: 10),
                              Expanded(child: Text(q, style: const TextStyle(fontWeight: FontWeight.w700, color: C.slate700))),
                              const Icon(Icons.north_east_rounded, size: 16, color: C.slate400),
                            ]),
                          ),
                        ),
                      ),
                    ),
                ],
                for (final m in _msgs) _Bubble(m: m),
                if (_busy) const Padding(
                  padding: EdgeInsets.only(top: 6),
                  child: Row(children: [SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)), SizedBox(width: 8), Text('Thinking…', style: TextStyle(color: C.slate500))]),
                ),
              ]);
            },
          ),
        ),
        if (st.valueOrNull?.enabled == true)
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
              decoration: const BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Color(0x14000000), blurRadius: 10, offset: Offset(0, -2))]),
              child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Expanded(
                  child: TextField(
                    controller: _text, minLines: 1, maxLines: 4, textInputAction: TextInputAction.send, onSubmitted: (_) => _send(),
                    decoration: InputDecoration(
                      hintText: 'Ask the assistant…', filled: true, fillColor: C.bg,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: BorderSide.none),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: BorderSide.none),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: const BorderSide(color: C.brand)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Material(
                  color: C.blue, shape: const CircleBorder(),
                  child: InkWell(customBorder: const CircleBorder(), onTap: _busy ? null : () => _send(),
                      child: const SizedBox(width: 46, height: 46, child: Icon(Icons.send_rounded, color: Colors.white, size: 20))),
                ),
              ]),
            ),
          ),
      ]),
    );
  }
}

class _Bubble extends StatelessWidget {
  final _Msg m;
  const _Bubble({required this.m});
  @override
  Widget build(BuildContext context) {
    if (m.mine) {
      return Align(
        alignment: Alignment.centerRight,
        child: Container(
          margin: const EdgeInsets.only(bottom: 10, left: 48),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: const BoxDecoration(gradient: LinearGradient(colors: [C.sky, C.blue]),
              borderRadius: BorderRadius.only(topLeft: Radius.circular(18), topRight: Radius.circular(18), bottomLeft: Radius.circular(18), bottomRight: Radius.circular(4))),
          child: Text(m.text, style: const TextStyle(color: Colors.white, fontSize: 14.5, height: 1.35)),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 12, right: 24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
          decoration: BoxDecoration(
            color: m.error ? const Color(0xFFFFF1F2) : Colors.white,
            border: Border.all(color: m.error ? const Color(0xFFFECDD3) : const Color(0xFFEEF2F7)),
            borderRadius: const BorderRadius.only(topLeft: Radius.circular(4), topRight: Radius.circular(18), bottomLeft: Radius.circular(18), bottomRight: Radius.circular(18)),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SelectableText(m.text.replaceAll('**', ''), style: TextStyle(fontSize: 14.5, height: 1.4, color: m.error ? const Color(0xFFBE123C) : C.slate800)),
            if (!m.error)
              TextButton.icon(
                style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 30), foregroundColor: C.slate400),
                onPressed: () { Clipboard.setData(ClipboardData(text: m.text.replaceAll('**', ''))); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copied'))); },
                icon: const Icon(Icons.copy_rounded, size: 14), label: const Text('Copy', style: TextStyle(fontSize: 12)),
              ),
          ]),
        ),
        for (final c in m.cards) _DataCard(c: c),
      ]),
    );
  }
}

/// A school-data result the assistant used: title, the number, and its breakdown.
class _DataCard extends StatelessWidget {
  final Map c;
  const _DataCard({required this.c});
  @override
  Widget build(BuildContext context) {
    final stat = c['stat'] is Map ? c['stat'] as Map : null;
    final rows = ((c['breakdown'] ?? (c['chart'] is Map ? c['chart']['data'] : null) ?? const []) as List).whereType<Map>().take(8).toList();
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: const Color(0xFF1E3A8A).withValues(alpha: 0.07), blurRadius: 12, offset: const Offset(0, 4))]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.insights_outlined, size: 16, color: C.iconInk), const SizedBox(width: 6),
          Expanded(child: Text((c['title'] ?? 'School data').toString().toUpperCase(), style: const TextStyle(fontSize: 11, letterSpacing: 0.6, fontWeight: FontWeight.w800, color: C.slate500))),
        ]),
        if (stat != null) Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
            Text('${stat['value']}', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: C.blue)),
            const SizedBox(width: 6),
            Text((stat['label'] ?? '').toString(), style: const TextStyle(color: C.slate500, fontWeight: FontWeight.w600)),
          ]),
        ),
        for (final r in rows)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Row(children: [
              Expanded(child: Text('${r['label']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: C.slate600, fontSize: 13))),
              Text('${r['value']}', style: const TextStyle(fontWeight: FontWeight.w800, color: C.slate800, fontSize: 13)),
            ]),
          ),
      ]),
    );
  }
}

class _Notice extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? hint;
  final Widget? action;
  const _Notice({required this.icon, required this.title, this.hint, this.action});
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            DuoIcon(icon: icon, color: C.blue, size: 46),
            const SizedBox(height: 14),
            Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: C.ink)),
            if (hint != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(hint!, textAlign: TextAlign.center, style: const TextStyle(color: C.slate500))),
            if (action != null) Padding(padding: const EdgeInsets.only(top: 18), child: action!),
          ]),
        ),
      );
}
