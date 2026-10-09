import { Db, ObjectId } from 'mongodb';

/**
 * Fee aid: scholarships/bursaries and sponsorships.
 *
 * Scholarships are DISCOUNTS — they reduce an invoice's total_due (and are
 * shown on it as a discount line), so collections and accounting only ever
 * count real money. Sponsorships are third parties paying real money: a
 * sponsor payment becomes ordinary fee payments (method "SPONSOR") on the
 * sponsored students' invoices.
 *
 * Collections:
 *   scholarship_schemes       { name, kind, valueType: percent|fixed, value, description, active }
 *   scholarship_awards        { schemeId, schemeName, studentId, studentName, registrationNo, className,
 *                               valueType, value, startDate, endDate, status: active|suspended|ended, totalApplied }
 *   scholarship_applications  { awardId, invoiceId, invoiceNo, studentId, amount, reversed }
 *   sponsors                  { name, type, contactPerson, phone, email, address, notes, active, unallocated }
 *   sponsorships              { sponsorId, sponsorName, studentId, studentName, registrationNo, className,
 *                               coverage: full|percent|fixed, value, startDate, endDate, status, totalPaid }
 *   sponsor_payments          { sponsorId, sponsorName, amount, method, reference, payment_date, allocations[], unallocated }
 */

export const N = (v: any) => Number(v) || 0;
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const oid = (v: any): ObjectId | null => { try { return new ObjectId(String(v)); } catch { return null; } };

/** Matches invoice.student_id whether stored as string or ObjectId. */
export const studentIdIn = (sid: string) => {
    const o = oid(sid);
    return { $in: o ? [sid, o] : [sid] };
};

const CLOSED = ['PAID', 'VOIDED', 'WAIVED'];

/** Invoices that still have money owing, oldest first. */
export async function openInvoices(db: Db, studentId: string): Promise<any[]> {
    const rows = await db.collection('invoices')
        .find({ student_id: studentIdIn(studentId), status: { $nin: CLOSED } })
        .sort({ createdAt: 1 }).toArray();
    return rows.filter(inv => invoiceBalance(inv) > 0);
}

export const invoiceBalance = (inv: any) =>
    Math.max(0, N(inv.balance ?? (N(inv.total_due ?? inv.total) - N(inv.amount_paid ?? inv.paid_amount ?? inv.amountPaid))));

const invoiceStatus = (inv: any, balance: number, paid: number) => {
    if (balance <= 0) return 'PAID';
    if (paid > 0) return 'PARTIAL';
    if (inv.due_date && new Date(inv.due_date) < new Date()) return 'OVERDUE';
    return 'UNPAID';
};

/** Is this award in force on `at`? */
const awardLive = (a: any, at = new Date()) =>
    a.status === 'active' && (!a.startDate || new Date(a.startDate) <= at) && (!a.endDate || new Date(a.endDate) >= at);

/** What an award is worth on an invoice (before capping by what is owed). */
export const awardAmountFor = (award: any, inv: any) => {
    const base = N(inv.subtotal ?? inv.total_due ?? inv.total);
    return award.valueType === 'percent' ? round2(base * Math.min(100, N(award.value)) / 100) : N(award.value);
};

/**
 * Apply one award to one invoice as a discount. Idempotent: an award is only
 * ever applied once per invoice. Returns the amount discounted.
 */
export async function applyAwardToInvoice(db: Db, award: any, invoiceIn: any, by = 'SYSTEM'): Promise<number> {
    const invoice = await db.collection('invoices').findOne({ _id: invoiceIn._id });
    if (!invoice || CLOSED.includes(invoice.status)) return 0;
    const already = await db.collection('scholarship_applications').findOne({ awardId: String(award._id), invoiceId: String(invoice._id), reversed: { $ne: true } });
    if (already) return 0;

    const paid = N(invoice.amount_paid ?? invoice.paid_amount ?? invoice.amountPaid);
    const totalDue = N(invoice.total_due ?? invoice.total);
    const room = Math.max(0, totalDue - paid);               // never discount below what's been paid
    const amount = round2(Math.min(room, awardAmountFor(award, invoice)));
    if (amount <= 0) return 0;

    const newTotal = round2(totalDue - amount);
    const balance = round2(Math.max(0, newTotal - paid));
    await db.collection('invoices').updateOne({ _id: invoice._id }, {
        $set: {
            total_due: newTotal, balance, status: invoiceStatus(invoice, balance, paid),
            discount_amount: round2(N(invoice.discount_amount) + amount),
            scholarship_amount: round2(N(invoice.scholarship_amount) + amount),
            updatedAt: new Date().toISOString(),
        },
        $push: { scholarships: { awardId: String(award._id), name: award.schemeName, amount } } as any,
    });
    await db.collection('scholarship_applications').insertOne({
        awardId: String(award._id), schemeId: award.schemeId, schemeName: award.schemeName,
        invoiceId: String(invoice._id), invoiceNo: invoice.invoice_no || '', studentId: String(award.studentId),
        studentName: award.studentName, amount, reversed: false, appliedBy: by, createdAt: new Date(),
    });
    await db.collection('scholarship_awards').updateOne({ _id: award._id }, { $inc: { totalApplied: amount } });
    await db.collection('fee_audit_logs').insertOne({
        schoolId: invoice.schoolId, action: 'SCHOLARSHIP', entity_type: 'INVOICE', entity_id: invoice._id,
        invoice_no: invoice.invoice_no, student_name: award.studentName, amount,
        reason: `${award.schemeName} applied`, performed_by: by, performed_at: new Date().toISOString(),
    }).catch(() => { });
    return amount;
}

/** Hook for new fee invoices: apply every live award the student holds. */
export async function applyScholarshipsToInvoice(db: Db, invoice: any, by = 'SYSTEM'): Promise<number> {
    try {
        const sid = String(invoice.student_id || '');
        if (!sid) return 0;
        const awards = await db.collection('scholarship_awards').find({ studentId: sid, status: 'active' }).toArray();
        let total = 0;
        for (const a of awards.filter(a => awardLive(a))) total += await applyAwardToInvoice(db, a, invoice, by);
        return total;
    } catch { return 0; }                                    // never block invoicing
}

/** Apply one award to all of the student's currently open invoices. */
export async function applyAwardToOpenInvoices(db: Db, award: any, by: string): Promise<{ invoices: number; amount: number }> {
    if (!awardLive(award)) return { invoices: 0, amount: 0 };
    let invoices = 0, amount = 0;
    for (const inv of await openInvoices(db, String(award.studentId))) {
        if (inv.fee_structure_id === undefined && !inv.line_items) continue;   // fee-structure invoices only (not trips/sports)
        const a = await applyAwardToInvoice(db, award, inv, by);
        if (a > 0) { invoices++; amount += a; }
    }
    return { invoices, amount: round2(amount) };
}

/** Undo one application (e.g. awarded in error). Restores the invoice total. */
export async function reverseApplication(db: Db, appId: string, by: string): Promise<boolean> {
    const app = await db.collection('scholarship_applications').findOne({ _id: oid(appId) as any, reversed: { $ne: true } });
    if (!app) return false;
    const invoice = await db.collection('invoices').findOne({ _id: oid(app.invoiceId) as any });
    if (invoice && invoice.status !== 'VOIDED') {
        const paid = N(invoice.amount_paid ?? invoice.paid_amount);
        const newTotal = round2(N(invoice.total_due) + N(app.amount));
        const balance = round2(Math.max(0, newTotal - paid));
        await db.collection('invoices').updateOne({ _id: invoice._id }, {
            $set: {
                total_due: newTotal, balance, status: invoiceStatus(invoice, balance, paid),
                discount_amount: round2(Math.max(0, N(invoice.discount_amount) - N(app.amount))),
                scholarship_amount: round2(Math.max(0, N(invoice.scholarship_amount) - N(app.amount))),
                updatedAt: new Date().toISOString(),
            },
            $pull: { scholarships: { awardId: app.awardId } } as any,
        });
    }
    await db.collection('scholarship_applications').updateOne({ _id: app._id }, { $set: { reversed: true, reversedBy: by, reversedAt: new Date() } });
    await db.collection('scholarship_awards').updateOne({ _id: oid(app.awardId) as any }, { $inc: { totalApplied: -N(app.amount) } });
    return true;
}

// ── Sponsorships ─────────────────────────────────────────────────────────────

/** What a sponsor is expected to cover of a student's outstanding balance. */
export const sponsorShare = (sp: any, outstanding: number) => {
    if (sp.coverage === 'full') return outstanding;
    if (sp.coverage === 'percent') return round2(outstanding * Math.min(100, N(sp.value)) / 100);
    return Math.min(outstanding, N(sp.value));
};

export const sponsorshipLive = (sp: any, at = new Date()) =>
    sp.status === 'active' && (!sp.startDate || new Date(sp.startDate) <= at) && (!sp.endDate || new Date(sp.endDate) >= at);

export async function studentOutstanding(db: Db, studentId: string) {
    return round2((await openInvoices(db, studentId)).reduce((s, i) => s + invoiceBalance(i), 0));
}

/**
 * Pay `amount` onto a student's open invoices (oldest first) as sponsor money.
 * Returns how much was used and the receipts created.
 */
export async function paySponsoredStudent(
    db: Db,
    ctx: { schoolId: string; sponsor: any; sponsorPaymentId: string; method: string; reference?: string; payment_date: string; by: string },
    studentId: string,
    amount: number,
    nextReceiptNo: (db: Db, schoolId: string) => Promise<string>,
    journal: (db: Db, payment: any, studentName?: string) => Promise<void>,
): Promise<{ used: number; receipts: string[] }> {
    let left = round2(amount);
    const receipts: string[] = [];
    const stu = await db.collection('students').findOne({ _id: oid(studentId) as any }).catch(() => null);
    for (const inv of await openInvoices(db, studentId)) {
        if (left <= 0) break;
        const bal = invoiceBalance(inv);
        const pay = round2(Math.min(bal, left));
        if (pay <= 0) continue;
        const receipt_no = await nextReceiptNo(db, ctx.schoolId);
        const payment = {
            _id: new ObjectId(), receipt_no, schoolId: ctx.schoolId, invoice_id: String(inv._id), student_id: inv.student_id,
            amount: pay, method: 'SPONSOR', reference: ctx.reference || ctx.sponsor.name, payment_date: ctx.payment_date,
            remarks: `Sponsored by ${ctx.sponsor.name}`, sponsor_id: String(ctx.sponsor._id), sponsor_payment_id: ctx.sponsorPaymentId,
            collected_by: ctx.by, is_voided: false, createdAt: new Date().toISOString(),
        };
        await db.collection('payments').insertOne(payment);
        await journal(db, { ...payment, method: ctx.method }, stu?.studentName);
        const paid = round2(N(inv.amount_paid ?? inv.paid_amount) + pay);
        const balance = round2(Math.max(0, N(inv.total_due ?? inv.total) - paid));
        await db.collection('invoices').updateOne({ _id: inv._id }, {
            $set: { amount_paid: paid, paid_amount: paid, balance, status: invoiceStatus(inv, balance, paid), updatedAt: new Date().toISOString() },
        });
        receipts.push(receipt_no);
        left = round2(left - pay);
    }
    const used = round2(amount - left);
    if (used > 0) {
        await db.collection('sponsorships').updateOne(
            { sponsorId: String(ctx.sponsor._id), studentId, status: { $ne: 'ended' } },
            { $inc: { totalPaid: used } },
        );
    }
    return { used, receipts };
}
