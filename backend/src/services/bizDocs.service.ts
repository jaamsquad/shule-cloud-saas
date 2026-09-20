/**
 * Business documents — quotations, invoices and contracts ShuleCloud issues to schools.
 * One collection, `biz_documents` (meta DB), with `type` = 'invoice' | 'quote' | 'contract'.
 * Each has a random `publicId` for its shareable link (/lnk/doc/<type>/<publicId>).
 *
 * Invoice payments (M-PESA STK push to the platform paybill, or recorded by hand) are kept
 * in the document's `payments[]`; an invoice carrying a `subscription` puts the school on that
 * plan the moment it is paid in full.
 */
import crypto from 'crypto';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { parseStkCallback, stkResultMessage } from './mpesa.service';
import { activateSubscription } from './subscription.service';

export type DocType = 'invoice' | 'quote' | 'contract';
export const DOC_TYPES: DocType[] = ['invoice', 'quote', 'contract'];
export const DOC_PREFIX: Record<DocType, string> = { invoice: 'INV', quote: 'QUO', contract: 'CON' };
export const TERM_DAYS: Record<string, number> = { 'Due on Receipt': 0, 'Net 7': 7, 'Net 15': 15, 'Net 30': 30, 'Net 45': 45, 'Net 60': 60 };

export const todayISO = () => new Date().toISOString().slice(0, 10);
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (n: number) => Math.round(n * 100) / 100;

export const newPublicId = (): string => crypto.randomBytes(12).toString('base64url');

/** INV-0001, QUO-0001, CON-0001 — one running number per type, never reused. */
export async function nextDocNumber(meta: Db, type: DocType): Promise<string> {
    const doc: any = await meta.collection('biz_counters').findOneAndUpdate({ _id: type as any }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
    return `${DOC_PREFIX[type]}-${String(doc?.seq || 1).padStart(4, '0')}`;
}

/** Totals are always worked out here, never trusted from the browser. */
export function computeTotals(doc: any) {
    const items: any[] = Array.isArray(doc.items) ? doc.items : [];
    let subTotal = 0, tax = 0;
    for (const it of items) {
        const amount = num(it.quantity) * num(it.rate);
        subTotal += amount; tax += amount * num(it.taxPercent) / 100;
    }
    const d = doc.discount || {};
    let discountAmount = d.type === 'amount' ? num(d.value) : subTotal * num(d.value) / 100;
    discountAmount = Math.min(Math.max(discountAmount, 0), subTotal);
    const taxAfter = subTotal > 0 ? tax * (subTotal - discountAmount) / subTotal : 0;   // tax shrinks with the discount
    const total = subTotal - discountAmount + taxAfter + num(doc.shipping) + num(doc.adjustment);
    return { subTotal: money(subTotal), discountAmount: money(discountAmount), taxTotal: money(taxAfter), total: money(Math.max(total, 0)) };
}

/** Recompute paid / balance and (for a live invoice) its paid state from `payments`. */
export function applyPayments(doc: any) {
    const amountPaid = money((doc.payments || []).reduce((s: number, p: any) => s + num(p.amount), 0));
    const balanceDue = money(Math.max(0, num(doc.total) - amountPaid));
    let status = doc.status;
    if (status !== 'void') {
        if (num(doc.total) > 0 && balanceDue <= 0) status = 'paid';
        else if (amountPaid > 0) status = 'partially_paid';
        else if (status === 'paid' || status === 'partially_paid') status = 'sent';
    }
    return { amountPaid, balanceDue, status };
}

/** Status as shown to people: a sent invoice past its due date is overdue, a sent quote past expiry is expired… */
export function effectiveStatus(doc: any): string {
    const today = todayISO();
    if (doc.type === 'invoice' && ['sent', 'partially_paid'].includes(doc.status) && doc.dueDate && doc.dueDate < today && num(doc.balanceDue) > 0) return 'overdue';
    if (doc.type === 'quote' && doc.status === 'sent' && doc.expiryDate && doc.expiryDate < today) return 'expired';
    if (doc.type === 'contract' && doc.status === 'signed' && doc.contract?.endDate && doc.contract.endDate < today) return 'expired';
    return doc.status;
}

/** An invoice the customer can pay online right now. */
export const isPayable = (doc: any) =>
    doc.type === 'invoice' && ['sent', 'partially_paid'].includes(doc.status) && num(doc.balanceDue) > 0;

// ─── Payments ────────────────────────────────────────────────────────────────

/** Add a payment to a document, recompute it, and — if a subscription invoice is now paid — activate the plan. */
export async function recordPayment(meta: Db, docId: any, payment: { amount: number; method: string; reference?: string; date?: string; phone?: string; online?: boolean; checkoutRequestId?: string; by?: string; note?: string }) {
    const doc: any = await meta.collection('biz_documents').findOne({ _id: docId });
    if (!doc) throw new Error('Invoice not found');
    const entry = { id: new ObjectId().toHexString(), ...payment, amount: money(num(payment.amount)), date: payment.date || todayISO(), at: new Date() };
    const payments = [...(doc.payments || []), entry];
    const applied = applyPayments({ ...doc, payments });
    await meta.collection('biz_documents').updateOne({ _id: docId }, { $set: { payments, ...applied, updatedAt: new Date() } });

    if (applied.status === 'paid' && doc.subscription?.tenantId && doc.subscription?.planId && !doc.subscriptionActivatedAt) {
        // Flag first so a retry can never activate twice.
        const claimed = await meta.collection('biz_documents').updateOne({ _id: docId, subscriptionActivatedAt: { $exists: false } }, { $set: { subscriptionActivatedAt: new Date() } });
        if (claimed.modifiedCount) {
            await activateSubscription(meta, { tenantId: doc.subscription.tenantId, planId: doc.subscription.planId, amount: num(doc.total), receipt: payment.reference, extendFromCurrent: true });
        }
    }
    return { entry, ...applied };
}

/** An M-PESA STK payment finished: record it on the invoice exactly once (callback and status poll may both arrive). */
export async function settleBusinessPayment(meta: Db, pay: any, info: { receipt?: string; amount?: number; phone?: string }) {
    const upd = await meta.collection('biz_payments').updateOne(
        { _id: pay._id, status: { $ne: 'completed' } },
        { $set: { status: 'completed', mpesaReceipt: info.receipt || null, completedAt: new Date() } },
    );
    if (upd.modifiedCount === 0) {
        // Already settled (e.g. by the status poll, before the receipt was known): just attach the receipt.
        if (info.receipt) {
            await meta.collection('biz_payments').updateOne({ _id: pay._id, mpesaReceipt: null }, { $set: { mpesaReceipt: info.receipt } });
            await meta.collection('biz_documents').updateOne({ _id: pay.docId, 'payments.checkoutRequestId': pay.checkoutRequestId }, { $set: { 'payments.$.reference': info.receipt } });
        }
        return false;
    }
    await recordPayment(meta, pay.docId, {
        amount: info.amount || pay.amount, method: 'M-PESA', online: true, phone: String(info.phone || pay.phone || ''),
        reference: info.receipt || `STK-${String(pay.checkoutRequestId).slice(-8)}`, checkoutRequestId: pay.checkoutRequestId,
    });
    return true;
}

/** Safaricom's STK callback for a document payment. Returns false when it isn't one of ours. */
export async function handleBusinessCallback(meta: Db, stk: any): Promise<boolean> {
    const pay: any = await meta.collection('biz_payments').findOne({ checkoutRequestId: stk.CheckoutRequestID });
    if (!pay) return false;
    if (Number(stk.ResultCode) === 0) {
        const m = parseStkCallback(stk);
        await settleBusinessPayment(meta, pay, { receipt: m.mpesaReceiptNumber, amount: m.amount, phone: String(m.phoneNumber || '') });
    } else {
        await meta.collection('biz_payments').updateOne({ _id: pay._id, status: 'pending' }, { $set: { status: 'failed', resultCode: stk.ResultCode, resultDesc: stkResultMessage(stk.ResultCode, stk.ResultDesc), completedAt: new Date() } });
    }
    return true;
}

export const metaDb = () => getMetaDb();
