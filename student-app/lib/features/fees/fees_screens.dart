import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../models/models.dart';
import '../../providers/data_providers.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';

String _day(DateTime? d) => d == null ? '—' : DateFormat('d MMM y').format(d.toLocal());

/// Ask for an M-PESA phone + amount. Returns null when cancelled.
Future<(String, double)?> _askMpesa(BuildContext context, {required String title, double? suggested, String? note}) async {
  final phone = TextEditingController();
  final amount = TextEditingController(text: suggested != null && suggested > 0 ? suggested.toStringAsFixed(0) : '');
  final key = GlobalKey<FormState>();
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: SizedBox(
        width: 360,
        child: Form(
          key: key,
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (note != null) ...[Text(note, style: const TextStyle(color: AppColors.slate600, fontWeight: FontWeight.w600)), const SizedBox(height: 12)],
            const FieldLabel('M-PESA phone number'),
            TextFormField(
              controller: phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(hintText: '07XX XXX XXX', prefixIcon: Icon(Icons.phone_android)),
              validator: (v) => (v ?? '').replaceAll(RegExp(r'\D'), '').length < 9 ? 'Enter a valid phone number' : null,
            ),
            const SizedBox(height: 12),
            const FieldLabel('Amount (KES)'),
            TextFormField(
              controller: amount,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(hintText: '0', prefixIcon: Icon(Icons.payments_outlined)),
              validator: (v) => (double.tryParse((v ?? '').trim()) ?? 0) <= 0 ? 'Enter a valid amount' : null,
            ),
            const SizedBox(height: 10),
            const Text('An M-PESA prompt will pop up on this phone. Enter your PIN to complete.',
                style: TextStyle(fontSize: 12, color: AppColors.slate500)),
          ]),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), style: TextButton.styleFrom(foregroundColor: AppColors.slate500), child: const Text('Cancel')),
        FilledButton(
          style: FilledButton.styleFrom(minimumSize: const Size(120, 40)),
          onPressed: () {
            if (key.currentState?.validate() ?? false) Navigator.pop(ctx, true);
          },
          child: const Text('Send prompt'),
        ),
      ],
    ),
  );
  if (ok != true) return null;
  return (phone.text.trim(), double.parse(amount.text.trim()));
}

/// Start an STK push, poll its status for ~40s, and report the outcome.
/// Returns true when M-PESA confirmed the payment.
Future<bool> _runStk(BuildContext context, Future<String> Function() start, Future<String> Function(String) status) async {
  showDialog(
    context: context,
    barrierDismissible: false,
    builder: (_) => const AlertDialog(
      content: Row(children: [
        SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5)),
        SizedBox(width: 16),
        Expanded(child: Text('Check your phone and enter your M-PESA PIN…', style: TextStyle(fontWeight: FontWeight.w600))),
      ]),
    ),
  );
  var result = 'pending';
  String? error;
  try {
    final id = await start();
    for (var i = 0; i < 20 && (result == 'pending' || result == 'unknown'); i++) {
      await Future.delayed(const Duration(seconds: 2));
      if (id.isEmpty) break;
      result = await status(id);
    }
  } catch (e) {
    error = 'Could not send the M-PESA prompt. Check the number and try again.';
  }
  if (!context.mounted) return false;
  Navigator.of(context, rootNavigator: true).pop();
  if (error != null) {
    showToast(context, error, error: true);
  } else if (result == 'completed') {
    showToast(context, 'Payment received. Thank you!');
  } else if (result == 'failed') {
    showToast(context, 'The payment was cancelled or failed.', error: true);
  } else {
    showToast(context, 'Still waiting for M-PESA — your balance will update once it confirms.');
  }
  return result == 'completed';
}

// ── Fees ─────────────────────────────────────────────────────────────────────
class FeesScreen extends ConsumerWidget {
  const FeesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(feesProvider);
    return PortalPage(
      title: 'Fees & Payment',
      subtitle: async.valueOrNull?.term,
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(feesProvider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(feesProvider)),
          data: (f) => ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: [
            _BalanceCard(fees: f, onPay: () => _pay(context, ref, f.balance)),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => context.push('/wallet'),
                  icon: const Icon(Icons.account_balance_wallet_outlined, size: 18),
                  label: const Text('Pay from Wallet'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => context.push('/receipts'),
                  icon: const Icon(Icons.receipt_long_outlined, size: 18),
                  label: const Text('Receipts'),
                ),
              ),
            ]),
            const SizedBox(height: 20),
            PanelCard(
              title: 'Invoices',
              icon: Icons.request_quote_outlined,
              padding: EdgeInsets.zero,
              child: f.invoices.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('No invoices issued yet. Fees are due only once the school invoices them.',
                          style: TextStyle(color: AppColors.slate500)),
                    )
                  : Column(children: [
                      for (final (i, inv) in f.invoices.indexed) ...[
                        if (i > 0) const Divider(),
                        _InvoiceRow(inv: inv),
                      ],
                    ]),
            ),
            if (f.items.isNotEmpty) ...[
              const SizedBox(height: 20),
              PanelCard(
                title: 'Fee structure${f.term.isNotEmpty ? ' · ${f.term}' : ''}',
                icon: Icons.account_balance_outlined,
                child: Column(children: [
                  for (final it in f.items)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(children: [
                        Expanded(child: Text(it.name, style: const TextStyle(color: AppColors.slate700, fontWeight: FontWeight.w600))),
                        Text(ksh(it.amount), style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate800)),
                      ]),
                    ),
                  const Divider(height: 20),
                  Row(children: [
                    const Expanded(child: Text('Total (indicative)', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate800))),
                    Text(ksh(f.structureTotal), style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.goldText)),
                  ]),
                ]),
              ),
            ],
          ]),
        ),
      ),
    );
  }

  Future<void> _pay(BuildContext context, WidgetRef ref, double balance) async {
    final input = await _askMpesa(context, title: 'Pay fees via M-PESA', suggested: balance, note: 'Outstanding: ${ksh(balance)}');
    if (input == null || !context.mounted) return;
    final repo = ref.read(dataRepoProvider);
    await _runStk(context, () => repo.payFeesMpesa(phone: input.$1, amount: input.$2), repo.mpesaStatus);
    ref.invalidate(feesProvider);
    ref.invalidate(summaryProvider);
    ref.invalidate(receiptsProvider);
  }
}

class _BalanceCard extends StatelessWidget {
  final FeesSummary fees;
  final VoidCallback onPay;
  const _BalanceCard({required this.fees, required this.onPay});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [AppColors.accent, AppColors.accentDark]),
          borderRadius: BorderRadius.circular(AppTheme.radius),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('OUTSTANDING BALANCE', style: TextStyle(color: Colors.white70, fontSize: 10.5, letterSpacing: 0.8, fontWeight: FontWeight.w800)),
          Text(fees.balance <= 0 ? 'Cleared' : ksh(fees.balance),
              style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _kv('BILLED', ksh(fees.billed))),
            Expanded(child: _kv('PAID', ksh(fees.totalPaid))),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.accentDark,
                minimumSize: const Size(0, 40),
                padding: const EdgeInsets.symmetric(horizontal: 14),
              ),
              onPressed: fees.balance <= 0 ? null : onPay,
              icon: const Icon(Icons.phone_android, size: 18),
              label: const Text('Pay M-PESA'),
            ),
          ]),
        ]),
      );

  Widget _kv(String k, String v) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(k, style: const TextStyle(color: AppColors.gold, fontSize: 10, letterSpacing: 0.6, fontWeight: FontWeight.w900)),
        Text(v, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
      ]);
}

class _InvoiceRow extends StatelessWidget {
  final Invoice inv;
  const _InvoiceRow({required this.inv});
  @override
  Widget build(BuildContext context) {
    final paid = inv.balance <= 0;
    final color = paid ? AppColors.green : (inv.paid > 0 ? AppColors.tertiary : AppColors.error);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(inv.number.isEmpty ? 'Invoice' : 'Invoice ${inv.number}', style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate800)),
            Text([if (inv.term.isNotEmpty) inv.term, _day(inv.date)].join(' · '), style: const TextStyle(fontSize: 12.5, color: AppColors.slate500)),
          ]),
        ),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(ksh(inv.total), style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate800)),
          StatusPill(label: paid ? 'Paid' : 'Bal ${ksh(inv.balance)}', color: color),
        ]),
      ]),
    );
  }
}

// ── Receipts ─────────────────────────────────────────────────────────────────
class ReceiptsScreen extends ConsumerWidget {
  const ReceiptsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(receiptsProvider);
    return PortalPage(
      title: 'Receipts',
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(receiptsProvider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(receiptsProvider)),
          data: (list) => list.isEmpty
              ? const ErrorView(message: 'No payments recorded yet.', icon: Icons.receipt_long_outlined)
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final r = list[i];
                    final pending = r.status.toLowerCase() == 'pending';
                    return PanelCard(
                      title: 'Receipt ${r.receiptNo}',
                      icon: Icons.receipt_long_outlined,
                      action: Text(ksh(r.amount), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
                      child: Column(children: [
                        InfoField(label: 'Date', value: _day(r.date)),
                        InfoField(label: 'Payment mode', value: r.paymentMode),
                        if (r.reference.isNotEmpty) InfoField(label: 'Reference', value: r.reference),
                        InfoField(label: 'Purpose', value: r.purpose),
                        Row(children: [
                          const SizedBox(width: 108, child: Text('Status', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.slate600))),
                          StatusPill(label: r.status, color: pending ? AppColors.tertiary : AppColors.green),
                        ]),
                      ]),
                    );
                  },
                ),
        ),
      ),
    );
  }
}

// ── Wallet ───────────────────────────────────────────────────────────────────
class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(walletProvider);
    final fees = ref.watch(feesProvider).valueOrNull;
    return PortalPage(
      title: 'My Wallet',
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(walletProvider),
        child: async.when(
          loading: () => const SkeletonList(),
          error: (e, _) => ErrorView.fromError(e, onRetry: () => ref.invalidate(walletProvider)),
          data: (w) => ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.navy, Color(0xFF15395C)]),
                borderRadius: BorderRadius.circular(AppTheme.radius),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  const Expanded(
                    child: Text('WALLET BALANCE', style: TextStyle(color: Colors.white70, fontSize: 10.5, letterSpacing: 0.8, fontWeight: FontWeight.w800)),
                  ),
                  if (w.code.isNotEmpty)
                    Text(w.code, style: const TextStyle(color: AppColors.gold, fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 1)),
                ]),
                Text(ksh(w.balance), style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)),
                const SizedBox(height: 4),
                const Text('Use it at the school canteen and shop, or to pay fees.', style: TextStyle(color: Colors.white70, fontSize: 12.5)),
              ]),
            ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => _topUp(context, ref),
                  icon: const Icon(Icons.add_card, size: 18),
                  label: const Text('Top up'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: !w.allowFeePayment || w.balance <= 0 || (fees != null && fees.balance <= 0) ? null : () => _payFees(context, ref, w, fees),
                  icon: const Icon(Icons.school_outlined, size: 18),
                  label: const Text('Pay fees'),
                ),
              ),
            ]),
            const SizedBox(height: 20),
            PanelCard(
              title: 'Recent transactions',
              icon: Icons.swap_vert,
              padding: EdgeInsets.zero,
              child: w.transactions.isEmpty
                  ? const Padding(padding: EdgeInsets.all(16), child: Text('No transactions yet.', style: TextStyle(color: AppColors.slate500)))
                  : Column(children: [
                      for (final (i, t) in w.transactions.indexed) ...[
                        if (i > 0) const Divider(),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          child: Row(children: [
                            Container(
                              width: 34,
                              height: 34,
                              decoration: BoxDecoration(
                                color: (t.isCredit ? AppColors.green : AppColors.error).withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(t.isCredit ? Icons.south_west : Icons.north_east, size: 16, color: t.isCredit ? AppColors.green : AppColors.error),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(t.description.isNotEmpty ? t.description : (t.category.isNotEmpty ? t.category : (t.isCredit ? 'Top up' : 'Payment')),
                                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate800)),
                                Text(t.date == null ? '' : DateFormat('d MMM y, h:mm a').format(t.date!.toLocal()),
                                    style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                              ]),
                            ),
                            Text('${t.isCredit ? '+' : '−'}${ksh(t.amount)}',
                                style: TextStyle(fontWeight: FontWeight.w900, color: t.isCredit ? AppColors.green : AppColors.error)),
                          ]),
                        ),
                      ],
                    ]),
            ),
          ]),
        ),
      ),
    );
  }

  Future<void> _topUp(BuildContext context, WidgetRef ref) async {
    final input = await _askMpesa(context, title: 'Top up wallet');
    if (input == null || !context.mounted) return;
    final repo = ref.read(dataRepoProvider);
    await _runStk(context, () => repo.topUpWallet(phone: input.$1, amount: input.$2), repo.mpesaStatus);
    ref.invalidate(walletProvider);
  }

  Future<void> _payFees(BuildContext context, WidgetRef ref, StudentWallet w, FeesSummary? fees) async {
    final payable = fees == null ? w.balance : (fees.balance < w.balance ? fees.balance : w.balance);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Pay fees from wallet?'),
        content: Text('${ksh(payable)} will be paid from your wallet towards your fee balance.',
            style: const TextStyle(color: AppColors.slate600)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), style: TextButton.styleFrom(foregroundColor: AppColors.slate500), child: const Text('Cancel')),
          FilledButton(style: FilledButton.styleFrom(minimumSize: const Size(88, 40)), onPressed: () => Navigator.pop(ctx, true), child: const Text('Pay')),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    try {
      final msg = await ref.read(dataRepoProvider).payFeesFromWallet();
      if (context.mounted) showToast(context, msg);
    } catch (_) {
      if (context.mounted) showToast(context, 'Could not pay from the wallet. Try again.', error: true);
    }
    ref.invalidate(walletProvider);
    ref.invalidate(feesProvider);
    ref.invalidate(summaryProvider);
    ref.invalidate(receiptsProvider);
  }
}
