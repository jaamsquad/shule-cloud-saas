import { Db, ObjectId } from 'mongodb';

// ─── Student fee credit (overpayment) ──────────────────────────────────────────
// When a student pays more than they owe, the excess becomes a CREDIT (a negative
// balance). The running credit is kept on the student doc as `feeCredit` and each
// movement is logged in `fee_credits`. When a new invoice is created, available
// credit is auto-applied as a partial (or full) payment.

const N = (v: any) => Number(v) || 0;

const studentMatch = (opts: { studentId?: string; registrationNo?: string }): any => ({
    $or: [
        ...(opts.studentId ? [{ _id: tryId(opts.studentId) }] : []),
        ...(opts.registrationNo ? [{ registrationNo: opts.registrationNo }, { admNo: opts.registrationNo }] : []),
    ].filter(Boolean),
});
function tryId(v: any) { try { return new ObjectId(String(v)); } catch { return v; } }

/** Current available credit for a student (>= 0). */
export async function getCredit(db: Db, opts: { studentId?: string; registrationNo?: string }): Promise<number> {
    const stu = await db.collection('students').findOne(studentMatch(opts)).catch(() => null) as any;
    return Math.max(0, N(stu?.feeCredit));
}

/** Add `amount` to a student's credit (overpayment) and log it. */
export async function addCredit(db: Db, opts: { studentId?: string; studentName?: string; registrationNo?: string; amount: number; reason?: string; receipt?: string }) {
    const amount = N(opts.amount);
    if (amount <= 0) return;
    await db.collection('students').updateOne(studentMatch(opts), { $inc: { feeCredit: amount } }).catch(() => { });
    await db.collection('fee_credits').insertOne({
        studentId: opts.studentId, registrationNo: opts.registrationNo, studentName: opts.studentName,
        amount, type: 'credit', reason: opts.reason || 'Overpayment', receipt: opts.receipt, createdAt: new Date(),
    }).catch(() => { });
}

/** Spend up to `max` of a student's credit (returns how much was used) and log it. */
export async function useCredit(db: Db, opts: { studentId?: string; registrationNo?: string }, max: number, ctx: { invoiceId?: string; invoiceNo?: string } = {}): Promise<number> {
    const available = await getCredit(db, opts);
    const use = Math.min(available, Math.max(0, N(max)));
    if (use <= 0) return 0;
    await db.collection('students').updateOne(studentMatch(opts), { $inc: { feeCredit: -use } }).catch(() => { });
    await db.collection('fee_credits').insertOne({
        studentId: opts.studentId, registrationNo: opts.registrationNo,
        amount: -use, type: 'applied', reason: 'Applied to invoice', invoiceId: ctx.invoiceId, invoiceNo: ctx.invoiceNo, createdAt: new Date(),
    }).catch(() => { });
    return use;
}

/**
 * Auto-apply available credit to a freshly created invoice. Reduces the invoice
 * balance (partial or full) and records a credit-payment. Returns the amount used.
 */
export async function applyCreditToInvoice(db: Db, invoice: any, opts: { studentId?: string; registrationNo?: string; studentName?: string }): Promise<number> {
    const due = Math.max(0, N(invoice.total_due ?? invoice.amount) - N(invoice.paid_amount ?? invoice.amount_paid));
    if (due <= 0) return 0;
    const used = await useCredit(db, opts, due, { invoiceId: String(invoice._id), invoiceNo: invoice.invoice_no || invoice.invoiceNo });
    if (used <= 0) return 0;

    const newPaid = N(invoice.paid_amount ?? invoice.amount_paid) + used;
    const total = N(invoice.total_due ?? invoice.amount);
    const newBal = Math.max(0, total - newPaid);
    await db.collection('invoices').updateOne({ _id: invoice._id }, {
        $set: { paid_amount: newPaid, amount_paid: newPaid, balance: newBal, status: newBal <= 0 ? 'PAID' : 'PARTIAL', creditApplied: used, updatedAt: new Date() },
    });
    // Record a payment so it shows on the ledger/receipts.
    await db.collection('payments').insertOne({
        receipt_no: `CR${Date.now().toString().slice(-8)}`, student_id: opts.studentId, studentId: opts.studentId,
        studentName: opts.studentName, registrationNo: opts.registrationNo, amount: used, method: 'CREDIT',
        payment_mode: 'Fee Credit', invoice_id: String(invoice._id), status: 'Completed', createdAt: new Date(),
        note: 'Carried-forward overpayment credit',
    }).catch(() => { });
    return used;
}
