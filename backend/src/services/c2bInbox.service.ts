import { Db } from 'mongodb';
import { getMetaDb, getTenantDb } from '../lib/mongodb';
import { applyMpesaPayment } from './mpesa.service';
import { publish } from './sse.service';
import { sendEmail } from './communications.service';

// ─── C2B Payment Inbox ──────────────────────────────────────────────────────────
// Stores every C2B callback in full, identifies the receiving school by shortcode,
// auto-matches to a student, and exposes a reconciliation inbox. Heavy work
// (matching, accounting, notifications) runs after we've already ACKed Safaricom.
//
// Collections:
//   meta.c2b_inbox      — one doc per TransID (deduped), full raw payload + status
//   tenant.payments     — the applied fee payment (via applyMpesaPayment)

export type ReconStatus = 'pending' | 'auto_matched' | 'allocated' | 'rejected' | 'duplicate';

const num = (v: any) => Number(v) || 0;

/** M-PESA TransTime "YYYYMMDDHHmmss" → Date. */
function parseTransTime(t: string): Date | null {
    const m = String(t || '').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
}

/** Find the tenant (school) whose shortcode/till matches the callback. */
async function resolveTenantForShortcode(shortcode: string) {
    const meta = getMetaDb();
    const sc = String(shortcode || '').trim();
    if (!sc) return null;
    // Branch/Tenant mapping: a tenant's mpesa_settings holds shortcode + tillNumber,
    // AND (separately) registeredShortCode — the number C2B URLs were actually
    // registered against, which the operator can override at registration time and
    // which can drift from shortcode/tillNumber if settings are edited afterwards.
    // Match against all three, or a real Safaricom callback for an edited school
    // silently resolves to no tenant and the payment vanishes from the Inbox.
    const tenants = await meta.collection('Tenant').find({ status: 'active' }).toArray();
    for (const t of tenants) {
        if (!t.databaseName) continue;
        try {
            const db = getTenantDb(t.databaseName);
            const s: any = (await db.collection('mpesa_settings').findOne({})) || {};
            const codes = [s.shortcode, s.tillNumber, s.registeredShortCode].map((v: any) => String(v || '').trim());
            if (codes.includes(sc)) return { tenant: t, db };
        } catch { /* next */ }
    }
    return null;
}

/**
 * C2B Validation (POST /pesa/c2b/validation) — Safaricom calls this BEFORE the
 * money moves, and only if "External Validation" is enabled for the shortcode
 * (most schools leave it off, since M-PESA then completes the transaction and
 * sends Confirmation directly — see mpesa.routes.ts). When it IS enabled, we
 * get one chance to reject a payment before Safaricom finalises it.
 *
 * Daraja gives ~8 seconds to respond and expects ResultCode 0 to accept or a
 * non-zero code (C2B00011-C2B00016) to reject. We deliberately only reject on
 * hard, unambiguous problems (school not found, amount <= 0) — an unmatched
 * BillRefNumber is NOT a rejection reason, because the money is still real and
 * should land as an Unmatched Payment for staff to reconcile manually rather
 * than bouncing the customer's payment back at the M-PESA counter.
 */
export async function validateC2B(payload: any): Promise<{ ResultCode: number; ResultDesc: string }> {
    const shortcode = String(payload?.BusinessShortCode || '').trim();
    const amount = Number(payload?.TransAmount) || 0;

    // Daraja's validation response is a numeric ResultCode: 0 = accept, any
    // non-zero = reject (Safaricom cancels the transaction and refunds the payer).
    if (!shortcode) return { ResultCode: 1, ResultDesc: 'Invalid ShortCode' };
    if (amount <= 0) return { ResultCode: 1, ResultDesc: 'Invalid Amount' };

    const resolved = await resolveTenantForShortcode(shortcode);
    if (!resolved) {
        // No school owns this shortcode at all — genuinely nothing to accept into.
        return { ResultCode: 1, ResultDesc: 'Invalid ShortCode — not registered to any school' };
    }
    // Do NOT reject for an unmatched BillRefNumber/admission number — accept it
    // and let ingestC2B() file it as an Unmatched Payment for manual reconciliation.
    return { ResultCode: 0, ResultDesc: 'Accepted' };
}

/**
 * Persist a C2B callback (idempotent by TransID) with the full raw payload and
 * webhook metadata, identify the school, attempt auto-match, and apply when a
 * single confident match is found. Returns the inbox doc id.
 */
export async function ingestC2B(payload: any, meta2: { ip?: string; headers?: any }) {
    const meta = getMetaDb();
    const transId = String(payload.TransID || '').toUpperCase();
    const now = new Date();

    // ── Duplicate protection: a repeat callback updates, never duplicates ──────
    if (transId) {
        const existing = await meta.collection('c2b_inbox').findOne({ TransID: transId });
        if (existing) {
            await meta.collection('c2b_inbox').updateOne({ _id: existing._id }, { $set: { lastCallbackAt: now, duplicateCount: (existing.duplicateCount || 0) + 1 } });
            return { id: String(existing._id), duplicate: true };
        }
    }

    const shortcode = String(payload.BusinessShortCode || '').trim();
    const resolved = await resolveTenantForShortcode(shortcode);
    const customerName = [payload.FirstName, payload.MiddleName, payload.LastName].filter(Boolean).join(' ').trim();
    const businessType = String(payload.TransactionType || '').toLowerCase().includes('buy') ? 'till' : 'paybill';

    const doc: any = {
        TransID: transId,
        // Raw, never-discarded fields:
        MerchantRequestID: payload.MerchantRequestID || null,
        CheckoutRequestID: payload.CheckoutRequestID || null,
        TransactionType: payload.TransactionType || null,
        TransTime: payload.TransTime || null,
        TransAmount: num(payload.TransAmount),
        BusinessShortCode: shortcode,
        BillRefNumber: payload.BillRefNumber || '',
        InvoiceNumber: payload.InvoiceNumber || '',
        OrgAccountBalance: payload.OrgAccountBalance || null,
        ThirdPartyTransID: payload.ThirdPartyTransID || '',
        MSISDN: payload.MSISDN || '',
        FirstName: payload.FirstName || '', MiddleName: payload.MiddleName || '', LastName: payload.LastName || '',
        customerName,
        businessType,
        rawPayload: payload,
        webhookTimestamp: now,
        sourceIp: meta2.ip || '',
        requestHeaders: meta2.headers || {},
        // Resolution / status:
        tenantDbName: resolved?.tenant?.databaseName || null,
        tenantSubdomain: resolved?.tenant?.subdomain || null,
        organizationId: resolved?.tenant?.organizationId || null,
        paidAt: parseTransTime(payload.TransTime) || now,
        reconStatus: 'pending' as ReconStatus,
        matchedStudentId: null, matchedStudentName: null, matchedParent: null,
        processedBy: null, receiptNo: null,
        createdAt: now, lastCallbackAt: now, duplicateCount: 0,
    };

    const ins = await meta.collection('c2b_inbox').insertOne(doc);
    const inboxId = String(ins.insertedId);

    // Push the new payment to the school's open inboxes in real time.
    if (resolved?.tenant?.databaseName) publish(resolved.tenant.databaseName, 'payment', { ...doc, _id: inboxId });

    // ── Auto-match (best-effort) ──────────────────────────────────────────────
    if (resolved?.db) {
        try {
            const matches = await findStudentMatches(resolved.db, payload);
            if (matches.length === 1) {
                await allocate(inboxId, resolved.db, matches[0], { auto: true });
            } else if (matches.length > 1) {
                await meta.collection('c2b_inbox').updateOne({ _id: ins.insertedId }, { $set: { reconStatus: 'pending', needsReview: true, candidateCount: matches.length } });
            } else {
                // 0 matches → genuinely unmatched; alert the school admin to reconcile.
                notifyUnmatched(resolved.tenant, doc).catch(() => { });
            }
        } catch { /* leave pending */ }
    }
    return { id: inboxId, duplicate: false };
}

/** Candidate students for a callback, in priority order. */
export async function findStudentMatches(db: Db, payload: any) {
    const ref = String(payload.BillRefNumber || '').trim();
    const phone = String(payload.MSISDN || '').replace(/\D/g, '');
    const tail = phone.slice(-9);
    const out: any[] = [];
    const seen = new Set<string>();
    const push = (s: any) => { if (s && !seen.has(String(s._id))) { seen.add(String(s._id)); out.push(s); } };

    // 1) Account ref = admission/registration number.
    if (ref) {
        const byRef = await db.collection('students').find({ $or: [{ registrationNo: ref }, { admNo: ref }, { admissionNo: ref }] }).toArray().catch(() => []);
        byRef.forEach(push);
    }
    // 2) Invoice number.
    if (payload.InvoiceNumber) {
        const inv = await db.collection('invoices').findOne({ $or: [{ invoice_no: payload.InvoiceNumber }, { invoiceNo: payload.InvoiceNumber }] }).catch(() => null);
        if (inv?.studentId) { const s = await db.collection('students').findOne({ _id: toId(inv.studentId) }).catch(() => null); push(s); }
    }
    // 3) Payer phone = student / guardian phone.
    if (tail) {
        const rx = new RegExp(tail + '$');
        const byPhone = await db.collection('students').find({ $or: [{ phone: rx }, { parentPhone: rx }, { guardianPhone: rx }, { 'guardian.phone': rx }] }).limit(5).toArray().catch(() => []);
        byPhone.forEach(push);
    }
    return out;
}

function toId(v: any) { try { const { ObjectId } = require('mongodb'); return new ObjectId(String(v)); } catch { return v; } }

/**
 * Allocate an inbox payment to a student: apply the fee payment (ledger +
 * accounting + invoice), stamp the inbox doc, and mark it allocated/auto_matched.
 */
export async function allocate(inboxId: string, db: Db, student: any, opts: { auto?: boolean; processedBy?: string; invoiceId?: string } = {}) {
    const meta = getMetaDb();
    const { ObjectId } = require('mongodb');
    const inbox: any = await meta.collection('c2b_inbox').findOne({ _id: new ObjectId(inboxId) });
    if (!inbox) throw new Error('Inbox item not found.');
    if (inbox.reconStatus === 'allocated') throw new Error('Already allocated.');

    const receipt = inbox.TransID;
    // Guard against double-applying the same code.
    const dup = await db.collection('payments').findOne({ is_voided: { $ne: true }, $or: [{ mpesaCode: receipt }, { transactionId: receipt }] });
    if (!dup) {
        await applyMpesaPayment(db, {
            studentId: String(student._id), studentName: student.studentName,
            registrationNo: inbox.BillRefNumber || student.registrationNo || student.admNo,
            invoiceId: opts.invoiceId, amount: num(inbox.TransAmount), receipt, phone: inbox.MSISDN,
        });
    }
    await meta.collection('c2b_inbox').updateOne({ _id: inbox._id }, {
        $set: {
            reconStatus: opts.auto ? 'auto_matched' : 'allocated',
            matchedStudentId: String(student._id), matchedStudentName: student.studentName,
            matchedParent: student.parentName || student.guardianName || null,
            receiptNo: `MP${receipt}`, processedBy: opts.processedBy || (opts.auto ? 'auto' : null),
            allocatedAt: new Date(), needsReview: false,
        },
    });

    // Push the status change to open inboxes.
    publish(db.databaseName, 'update', { _id: inboxId, reconStatus: opts.auto ? 'auto_matched' : 'allocated', matchedStudentName: student.studentName });

    // Notify the payer/parent (SMS + in-app) — best-effort, never blocks.
    notifyAllocation(db, inbox, student).catch(() => { });
    return { ok: true };
}

/** Best-effort SMS + in-app + admin-email notice that a fee payment was applied. */
async function notifyAllocation(db: Db, inbox: any, student: any) {
    const amount = num(inbox.TransAmount);
    const name = student.parentName || student.guardianName || student.studentName || 'Parent';
    const msg = `Dear ${name}, KES ${amount.toLocaleString()} received via M-PESA (Receipt ${inbox.TransID}) and allocated to ${student.studentName}'s fee account. Thank you.`;
    // SMS to the payer's number (and the parent's, if different).
    const numbers = [inbox.MSISDN, student.parentPhone, student.guardianPhone, student.phone].filter(Boolean);
    try {
        const { queueSms } = await import('./smsGateway.service');
        const schoolId = String((await db.collection('school_profile').findOne({}))?._id || 'default');
        await queueSms(db, schoolId, numbers, msg, { audience: 'fees' });
    } catch { /* SMS optional */ }
    // In-app notification (parent portal + student portal both read this collection).
    try {
        await db.collection('notifications').insertOne({
            title: 'Fee payment received', message: msg, type: 'fees',
            studentId: String(student._id), read: false, createdAt: new Date(),
        });
    } catch { /* optional */ }
    // Admin email — best-effort, only if the tenant has a contact address on file.
    try {
        const meta = getMetaDb();
        const tenant: any = await meta.collection('Tenant').findOne({ databaseName: db.databaseName });
        const adminEmail = tenant?.contactEmail || tenant?.email;
        if (adminEmail) {
            await sendEmail(db, {
                to: [adminEmail], subject: `Fee payment received — ${student.studentName}`,
                message: `KES ${amount.toLocaleString()} received via M-PESA (Receipt ${inbox.TransID}, Phone ${inbox.MSISDN}) and auto-allocated to ${student.studentName} (${inbox.BillRefNumber || student.registrationNo || student.admNo}).`,
            });
        }
    } catch { /* email optional */ }
}

/** Best-effort admin alert for a C2B payment that could NOT be auto-matched to a student. */
async function notifyUnmatched(tenant: any, inbox: any) {
    if (!tenant?.databaseName) return;
    try {
        const db = getTenantDb(tenant.databaseName);
        await db.collection('notifications').insertOne({
            title: 'Unmatched M-PESA payment', type: 'fees_unmatched',
            message: `KES ${num(inbox.TransAmount).toLocaleString()} received from ${inbox.customerName || inbox.MSISDN || 'unknown payer'} (Receipt ${inbox.TransID}, Account "${inbox.BillRefNumber || '—'}") could not be matched to a student — reconcile it in Fees → Payment Inbox.`,
            read: false, createdAt: new Date(),
        });
        const adminEmail = tenant?.contactEmail || tenant?.email;
        if (adminEmail) {
            await sendEmail(db, {
                to: [adminEmail], subject: 'Unmatched M-PESA payment needs reconciliation',
                message: `A payment of KES ${num(inbox.TransAmount).toLocaleString()} (Receipt ${inbox.TransID}) from ${inbox.customerName || inbox.MSISDN || 'unknown payer'} using account/reference "${inbox.BillRefNumber || '—'}" could not be automatically matched to a student. Please review and allocate it in Fees → Payment Inbox.`,
            });
        }
    } catch { /* best-effort */ }
}

/** Soft-reverse an allocation: void the payment, mark inbox rejected. Never hard-delete. */
export async function reverse(inboxId: string, db: Db, by: string, reason: string) {
    const meta = getMetaDb();
    const { ObjectId } = require('mongodb');
    const inbox: any = await meta.collection('c2b_inbox').findOne({ _id: new ObjectId(inboxId) });
    if (!inbox) throw new Error('Inbox item not found.');
    await db.collection('payments').updateMany(
        { $or: [{ mpesaCode: inbox.TransID }, { transactionId: inbox.TransID }] },
        { $set: { is_voided: true, voidedAt: new Date(), voidReason: reason, voidedBy: by } },
    );
    await meta.collection('c2b_inbox').updateOne({ _id: inbox._id }, { $set: { reconStatus: 'rejected', reversedAt: new Date(), reversedBy: by, reverseReason: reason } });
    publish(db.databaseName, 'update', { _id: inboxId, reconStatus: 'rejected' });
    return { ok: true };
}
