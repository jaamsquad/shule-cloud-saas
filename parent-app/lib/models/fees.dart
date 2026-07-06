class FeePayment {
  final String title;
  final String date;
  final String method;
  final double amount;
  final String status; // CLEARED | PENDING
  const FeePayment({required this.title, this.date = '', this.method = '', this.amount = 0, this.status = ''});

  factory FeePayment.fromJson(Map<String, dynamic> j) => FeePayment(
        title: (j['title'] ?? j['description'] ?? 'Payment').toString(),
        date: (j['date'] ?? j['createdAt'] ?? '').toString(),
        method: (j['method'] ?? j['channel'] ?? '').toString(),
        amount: _d(j['amount'] ?? j['paid']),
        status: (j['status'] ?? '').toString(),
      );
  static double _d(dynamic v) => v is num ? v.toDouble() : double.tryParse('${v ?? ''}') ?? 0;
}

/// A payment receipt (mirrors the parent-portal receipts list).
class Receipt {
  final String receiptNo;
  final String date;
  final String paymentMode;
  final double amount;
  final String status;
  final String reference;
  final String purpose;
  final String servedBy;
  const Receipt({
    required this.receiptNo, this.date = '', this.paymentMode = '', this.amount = 0,
    this.status = 'Confirmed', this.reference = '', this.purpose = '', this.servedBy = '',
  });
  factory Receipt.fromJson(Map<String, dynamic> j) => Receipt(
        receiptNo: (j['receiptNo'] ?? j['receipt_no'] ?? '').toString(),
        date: (j['date'] ?? '').toString(),
        paymentMode: (j['paymentMode'] ?? j['method'] ?? '').toString(),
        amount: (j['amount'] is num) ? (j['amount'] as num).toDouble() : double.tryParse('${j['amount'] ?? ''}') ?? 0,
        status: (j['status'] ?? 'Confirmed').toString(),
        reference: (j['reference'] ?? '').toString(),
        purpose: (j['purpose'] ?? '').toString(),
        servedBy: (j['servedBy'] ?? '').toString(),
      );
}

class FeeLine {
  final String label;
  final double amount;
  const FeeLine(this.label, this.amount);
  factory FeeLine.fromJson(Map<String, dynamic> j) => FeeLine(
        (j['label'] ?? j['name'] ?? '').toString(),
        (j['amount'] is num ? (j['amount'] as num).toDouble() : double.tryParse('${j['amount'] ?? ''}') ?? 0),
      );
}

class FeesSummary {
  final double balance;
  final double paid;
  final double totalInvoiced;
  final String nextDueDate;
  final String term;
  final List<FeePayment> history;
  final List<FeeLine> breakdown;

  const FeesSummary({
    this.balance = 0, this.paid = 0, this.totalInvoiced = 0,
    this.nextDueDate = '', this.term = '',
    this.history = const [], this.breakdown = const [],
  });

  factory FeesSummary.fromJson(Map<String, dynamic> j) => FeesSummary(
        balance: _d(j['balance'] ?? j['outstanding']),
        paid: _d(j['paid']),
        totalInvoiced: _d(j['totalInvoiced'] ?? j['invoiced']),
        nextDueDate: (j['nextDueDate'] ?? j['dueDate'] ?? '').toString(),
        term: (j['term'] ?? '').toString(),
        history: ((j['history'] as List?) ?? (j['payments'] as List?) ?? []).map((e) => FeePayment.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
        breakdown: ((j['breakdown'] as List?) ?? []).map((e) => FeeLine.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
      );
  static double _d(dynamic v) => v is num ? v.toDouble() : double.tryParse('${v ?? ''}') ?? 0;
}
