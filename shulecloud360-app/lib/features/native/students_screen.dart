import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';

/// Students (native): search the school's learners, see contacts, call a parent.
class StudentsScreen extends ConsumerStatefulWidget {
  const StudentsScreen({super.key});
  @override
  ConsumerState<StudentsScreen> createState() => _StudentsScreenState();
}

class _StudentsScreenState extends ConsumerState<StudentsScreen> {
  String _q = '';
  Timer? _deb;
  Future<List<Map<String, dynamic>>>? _future;

  @override
  void initState() { super.initState(); _load(); }
  @override
  void dispose() { _deb?.cancel(); super.dispose(); }

  void _load() {
    final dio = ref.read(apiProvider);
    setState(() => _future = dio.get('/students', queryParameters: {if (_q.trim().length >= 2) 'search': _q.trim()}).then((r) {
      final d = r.data;
      final list = d is List ? d : (d is Map && d['data'] is List ? d['data'] : const []);
      return List<Map<String, dynamic>>.from(list.map((e) => Map<String, dynamic>.from(e as Map)));
    }));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Students')),
        body: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              decoration: const InputDecoration(hintText: 'Name, admission no. or class', prefixIcon: Icon(Icons.search)),
              onChanged: (v) { _q = v; _deb?.cancel(); _deb = Timer(const Duration(milliseconds: 350), _load); },
            ),
          ),
          Expanded(
            child: FutureBuilder<List<Map<String, dynamic>>>(
              future: _future,
              builder: (c, snap) {
                if (snap.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
                if (snap.hasError) return EmptyState(icon: Icons.wifi_off, title: errorText(snap.error!), action: OutlinedButton(onPressed: _load, child: const Text('Try again')));
                final rows = snap.data ?? const [];
                if (rows.isEmpty) return const EmptyState(icon: Icons.groups_outlined, title: 'No learners found');
                return RefreshIndicator(
                  onRefresh: () async => _load(),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                    itemCount: rows.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _row(rows[i]),
                  ),
                );
              },
            ),
          ),
        ]),
      );

  Widget _row(Map<String, dynamic> s) {
    final name = (s['studentName'] ?? '${s['firstName'] ?? ''} ${s['lastName'] ?? ''}').toString().trim();
    final status = (s['status'] ?? 'Active').toString();
    return Panel(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      onTap: () => _details(s, name),
      child: Row(children: [
        CircleAvatar(radius: 20, backgroundColor: C.brand.withValues(alpha: 0.1), child: Text(name.isEmpty ? '?' : name[0].toUpperCase(), style: const TextStyle(color: C.brandDark, fontWeight: FontWeight.w800))),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(name.isEmpty ? 'Learner' : name, style: const TextStyle(fontWeight: FontWeight.w700, color: C.ink)),
          Text([s['registrationNo'] ?? s['admNo'], s['studentClass'] ?? s['currentClass']].where((x) => x != null && '$x'.isNotEmpty).join(' · '), style: const TextStyle(color: C.slate500, fontSize: 12.5)),
        ])),
        if (status.toLowerCase() != 'active') Badge2(status, C.slate500),
        const Icon(Icons.chevron_right, color: C.slate400),
      ]),
    );
  }

  void _details(Map<String, dynamic> s, String name) {
    final phone = (s['parentPhone'] ?? s['fatherPhone'] ?? s['motherPhone'] ?? s['guardianPhone'] ?? '').toString();
    final parent = (s['parentName'] ?? s['fatherName'] ?? s['motherName'] ?? s['guardianName'] ?? '').toString();
    Widget line(String k, Object? v) => v == null || '$v'.isEmpty ? const SizedBox.shrink() : Padding(
          padding: const EdgeInsets.symmetric(vertical: 5),
          child: Row(children: [SizedBox(width: 120, child: Text(k, style: const TextStyle(color: C.slate500))), Expanded(child: Text('$v', style: const TextStyle(fontWeight: FontWeight.w600, color: C.slate800)))]));
    showModalBottomSheet<void>(
      context: context, showDragHandle: true, backgroundColor: Colors.white,
      builder: (c) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            line('Admission no.', s['registrationNo'] ?? s['admNo']),
            line('Class', s['studentClass'] ?? s['currentClass']),
            line('Gender', s['gender']),
            line('Status', s['status'] ?? 'Active'),
            line('Parent', parent),
            line('Parent phone', phone),
            line('Transport', s['transportZone']),
            const SizedBox(height: 12),
            Row(children: [
              if (phone.isNotEmpty) Expanded(child: OutlinedButton.icon(onPressed: () => launchUrl(Uri.parse('tel:$phone')), icon: const Icon(Icons.call_outlined), label: const Text('Call parent'))),
              if (phone.isNotEmpty) const SizedBox(width: 10),
              Expanded(child: FilledButton(onPressed: () { Navigator.pop(c); context.push(Uri(path: '/open', queryParameters: {'portal': 'admin', 'path': '/students/${s['_id']}', 'title': name, 'web': '1'}).toString()); }, child: const Text('Full profile'))),
            ]),
          ]),
        ),
      ),
    );
  }
}
