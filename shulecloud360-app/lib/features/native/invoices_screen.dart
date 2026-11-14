import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';

/// Fee invoices (native): totals, status filters, search; tap to open the invoice.
class InvoicesScreen extends ConsumerStatefulWidget {
  const InvoicesScreen({super.key});
  @override
  ConsumerState<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends ConsumerState<InvoicesScreen> {
  static const _tabs = [('ALL', 'All'), ('UNPAID', 'Unpaid'), ('OVERDUE', 'Overdue'), ('PARTIAL', 'Partly paid'), ('PAID', 'Paid')];
  String _status = 'ALL', _q = '';
  Timer? _deb;
  Future<Map<String, dynamic>>? _future;

  @override
  void initState() { super.initState(); _load(); }
  @override
  void dispose() { _deb?.cancel(); super.dispose(); }

  void _load() {
    final dio = ref.read(apiProvider);
    setState(() => _future = dio.get('/schools/default/invoices', queryParameters: {'limit': 50, 'status': _status, if (_q.trim().length >= 2) 'search': _q.trim()})
        .then((r) => Map<String, dynamic>.from(r.data as Map)));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Invoices')),
        body: FutureBuilder<Map<String, dynamic>>(
          future: _future,
          builder: (c, snap) {
            final meta = (snap.data?['meta'] ?? {}) as Map;
            final m = (meta['money'] ?? {}) as Map;
            final counts = (meta['counts'] ?? {}) as Map;
            final rows = List<Map<String, dynamic>>.from(((snap.data?['data'] ?? const []) as List).map((e) => Map<String, dynamic>.from(e as Map)));
            return RefreshIndicator(
              onRefresh: () async => _load(),
              child: ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 24), children: [
                GridView.count(crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 2.15, children: [
                  StatTile(label: 'Billed', value: money(m['billed'] as num?), icon: Icons.receipt_long_outlined, color: const Color(0xFF0284C7)),
                  StatTile(label: 'Collected', value: money(m['collected'] as num?), icon: Icons.payments_outlined, color: C.green),
                  StatTile(label: 'Outstanding', value: money(m['outstanding'] as num?), icon: Icons.warning_amber_rounded, color: C.red),
                  StatTile(label: 'Invoices', value: '${counts['ALL'] ?? 0}', icon: Icons.description_outlined, hint: '${counts['OVERDUE'] ?? 0} overdue'),
                ]),
                const SizedBox(height: 12),
                TextField(
                  decoration: const InputDecoration(hintText: 'Name, admission or invoice no.', prefixIcon: Icon(Icons.search)),
                  onChanged: (v) { _q = v; _deb?.cancel(); _deb = Timer(const Duration(milliseconds: 350), _load); },
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 38,
                  child: ListView(scrollDirection: Axis.horizontal, children: [
                    for (final t in _tabs) Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ChoiceChip(
                        label: Text('${t.$2} ${t.$1 == 'ALL' ? (counts['ALL'] ?? '') : t.$1 == 'UNPAID' ? ((counts['UNPAID'] ?? 0) + (counts['OVERDUE'] ?? 0)) : (counts[t.$1] ?? '')}'),
                        selected: _status == t.$1, onSelected: (_) { _status = t.$1; _load(); },
                        selectedColor: C.iconSoft, side: const BorderSide(color: C.slate200),
                      ),
                    ),
                  ]),
                ),
                const SizedBox(height: 10),
                if (snap.connectionState != ConnectionState.done) const Padding(padding: EdgeInsets.all(30), child: Center(child: CircularProgressIndicator()))
                else if (snap.hasError) EmptyState(icon: Icons.wifi_off, title: errorText(snap.error!), action: OutlinedButton(onPressed: _load, child: const Text('Try again')))
                else if (rows.isEmpty) const EmptyState(icon: Icons.description_outlined, title: 'No invoices here')
                else for (final inv in rows) Padding(padding: const EdgeInsets.only(bottom: 8), child: _row(inv)),
              ]),
            );
          },
        ),
      );

  Widget _row(Map<String, dynamic> inv) {
    final st = (inv['status'] ?? '').toString();
    final bal = (inv['balance'] ?? 0) as num;
    return Panel(
      padding: const EdgeInsets.all(14),
      onTap: () => context.push(Uri(path: '/open', queryParameters: {'portal': 'admin', 'path': '/fees/invoice/${inv['_id']}', 'title': inv['invoice_no']?.toString() ?? 'Invoice', 'web': '1'}).toString()),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(inv['student_name']?.toString() ?? '—', style: const TextStyle(fontWeight: FontWeight.w700, color: C.ink))),
          Badge2(st.toLowerCase(), statusColor(st)),
        ]),
        const SizedBox(height: 2),
        Text([inv['invoice_no'], inv['class_name'], inv['term_label']].where((x) => x != null && '$x'.isNotEmpty).join(' · '), style: const TextStyle(color: C.slate500, fontSize: 12.5)),
        const SizedBox(height: 8),
        Row(children: [
          _kv('Total', money(inv['total_due'] as num?)),
          _kv('Paid', money(inv['amount_paid'] as num?), C.green),
          _kv('Balance', money(bal), bal > 0 ? C.red : C.green),
        ]),
      ]),
    );
  }

  Widget _kv(String k, String v, [Color c = C.slate800]) => Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(k, style: const TextStyle(color: C.slate400, fontSize: 11.5)),
        Text(v, style: TextStyle(fontWeight: FontWeight.w700, color: c, fontSize: 13)),
      ]));
}
