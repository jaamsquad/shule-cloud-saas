import { Router } from 'express';
import { getMetaDb, getTenantDb } from '../lib/mongodb';
import { parseStkCallback, applyMpesaPayment, stkResultMessage } from '../services/mpesa.service';
import { creditWallet } from '../services/wallet.service';

const router = Router();

// Finalize a school's subscription when its STK payment completes.
async function handleSubscriptionCallback(meta: any, stk: any) {
    const pay = await meta.collection('subscription_payments').findOne({ checkoutRequestId: stk.CheckoutRequestID });
    if (!pay) { console.warn('[M-PESA] callback for unknown checkoutRequestId:', stk.CheckoutRequestID); return; }
    const { ObjectId } = await import('mongodb');

    if (Number(stk.ResultCode) === 0) {
        const m = parseStkCallback(stk);
        const upd = await meta.collection('subscription_payments').updateOne(
            { _id: pay._id, status: { $ne: 'completed' } },
            { $set: { status: 'completed', mpesaReceipt: m.mpesaReceiptNumber, completedAt: new Date() } },
        );
        if (upd.modifiedCount > 0) {
            const plan = await meta.collection('Plan').findOne({ _id: new ObjectId(String(pay.planId)) });
            const durationDays = Number(plan?.durationDays) > 0 ? Number(plan.durationDays) : 30;
            const graceDays = Number(plan?.graceDays) >= 0 ? Number(plan.graceDays) : 0;
            const expiresAt = new Date(Date.now() + durationDays * 86400000);
            const graceUntil = new Date(expiresAt.getTime() + graceDays * 86400000);
            const tenantId = new ObjectId(String(pay.tenantId));
            await meta.collection('TenantSubscription').updateOne(
                { tenantId },
                { $set: { tenantId, planId: pay.planId, planName: pay.planName, amount: pay.amount, status: 'active', expiresAt, graceUntil, mpesaReceipt: m.mpesaReceiptNumber, updatedAt: new Date() }, $unset: { pendingPlanId: '', pendingPlanName: '' } },
                { upsert: true },
            );
            await meta.collection('Tenant').updateOne(
                { _id: tenantId },
                { $set: { planId: pay.planId, plan: pay.planName, enabledModules: plan?.modules || [], status: 'active', updatedAt: new Date() } },
            );
            console.log('[M-PESA] subscription activated:', pay.planName, 'for tenant', String(pay.tenantId));
        }
    } else {
        await meta.collection('subscription_payments').updateOne(
            { _id: pay._id }, { $set: { status: 'failed', resultDesc: stk.ResultDesc, completedAt: new Date() } },
        );
    }
}

// ─── STK Push callback ──────────────────────────────────────────────────────────
// Answers at both /mpesa/callback (configured URL) and /mpesa/stk-callback (alias).
router.post(['/mpesa/callback', '/mpesa/stk-callback'], async (req, res) => {
    // Always acknowledge so Safaricom stops retrying.
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    try {
        const stk = req.body?.Body?.stkCallback;
        if (!stk) { console.warn('[M-PESA] callback with no stkCallback body:', JSON.stringify(req.body)); return; }
        console.log('[M-PESA] STK callback:', JSON.stringify({ id: stk.CheckoutRequestID, code: stk.ResultCode, desc: stk.ResultDesc }));
        const meta = getMetaDb();
        const txn = await meta.collection('mpesa_transactions').findOne({ checkoutRequestId: stk.CheckoutRequestID });
        if (!txn) {
            // Not a fee/wallet payment — maybe a school subscription payment.
            await handleSubscriptionCallback(meta, stk);
            return;
        }

        if (Number(stk.ResultCode) === 0) {
            const m = parseStkCallback(stk);
            // Guard against double-credit (callback + status poll).
            const upd = await meta.collection('mpesa_transactions').updateOne(
                { _id: txn._id, applied: { $ne: true } },
                { $set: { status: 'completed', applied: true, mpesaReceipt: m.mpesaReceiptNumber, resultDesc: stk.ResultDesc, completedAt: new Date() } },
            );
            if (upd.modifiedCount > 0 && txn.tenantDbName) {
                const tdb = getTenantDb(txn.tenantDbName);
                if (txn.purpose === 'wallet') {
                    await creditWallet(tdb, txn.studentId, m.amount || txn.amount, { source: 'M-PESA', reference: m.mpesaReceiptNumber, by: 'mpesa' });
                } else {
                    await applyMpesaPayment(tdb, {
                        studentId: txn.studentId, studentName: txn.studentName, registrationNo: txn.registrationNo, invoiceId: txn.invoiceId,
                        amount: m.amount || txn.amount, receipt: m.mpesaReceiptNumber, phone: String(m.phoneNumber || txn.phone || ''),
                    });
                }
            }
        } else {
            await meta.collection('mpesa_transactions').updateOne(
                { _id: txn._id },
                { $set: { status: 'failed', resultCode: stk.ResultCode, resultDesc: stkResultMessage(stk.ResultCode, stk.ResultDesc), completedAt: new Date() } },
            );
        }
    } catch (e) {
        console.error('[M-PESA] stk-callback error:', e);
    }
});

// ─── C2B validation (accept all by default) ────────────────────────────────────
// Served at both /mpesa/c2b/validation and /pesa/c2b/validation (Safaricom URL).
router.post(['/mpesa/c2b/validation', '/pesa/c2b/validation'], (_req, res) => {
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// ─── C2B confirmation ──────────────────────────────────────────────────────────
// Served at both /mpesa/c2b/confirmation and /pesa/c2b/confirmation.
router.post(['/mpesa/c2b/confirmation', '/pesa/c2b/confirmation'], async (req, res) => {
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    try {
        const p = req.body || {};
        const meta = getMetaDb();
        await meta.collection('mpesa_c2b_payments').insertOne({ ...p, receivedAt: new Date() });

        // Best-effort: match the BillRefNumber (account = student reg no) to a student in any active tenant.
        const ref = p.BillRefNumber;
        if (ref) {
            const tenants = await meta.collection('Tenant').find({ status: 'active' }).toArray();
            for (const t of tenants) {
                const dbName = t.databaseName; if (!dbName) continue;
                try {
                    const db = getTenantDb(dbName);
                    const student = await db.collection('students').findOne({ $or: [{ registrationNo: ref }, { admNo: ref }] });
                    if (student) {
                        await applyMpesaPayment(db, { studentId: String(student._id), studentName: student.studentName, registrationNo: ref, amount: Number(p.TransAmount), receipt: p.TransID, phone: p.MSISDN });
                        break;
                    }
                } catch { /* try next tenant */ }
            }
        }
    } catch (e) {
        console.error('[M-PESA] c2b confirmation error:', e);
    }
});

// ─── Transaction Status result callback (reconciliation) ───────────────────────
// Aliased under /pesa/... too — Safaricom rejects callback URLs containing "mpesa".
router.post(['/mpesa/transaction-status/result', '/pesa/transaction-status/result'], async (req, res) => {
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    try {
        const meta = getMetaDb();
        await meta.collection('mpesa_status_results').insertOne({ ...req.body, receivedAt: new Date() });

        // Parse the verdict and store it keyed by the M-PESA code so the UI can poll.
        const r = req.body?.Result || {};
        const params: any[] = r.ResultParameters?.ResultParameter || [];
        const pick = (k: string) => params.find(p => p.Key === k)?.Value;
        const code = String(pick('ReceiptNo') || pick('TransactionID') || pick('OriginalTransactionID') || '').toUpperCase();
        if (code) {
            const valid = Number(r.ResultCode) === 0;
            await meta.collection('mpesa_code_verifications').updateOne(
                { code },
                {
                    $set: {
                        code, valid,
                        resultCode: Number(r.ResultCode),
                        resultDesc: r.ResultDesc || '',
                        amount: Number(pick('Amount')) || undefined,
                        payerName: pick('DebitPartyName') || pick('CreditPartyName') || undefined,
                        phone: String(pick('DebitPartyName') || '').match(/2547\d{8}/)?.[0] || undefined,
                        receivedAt: new Date(),
                    },
                },
                { upsert: true },
            );
        }
    } catch (e) { console.error('[M-PESA] txn-status result error:', e); }
});

router.post(['/mpesa/timeout', '/pesa/timeout'], (_req, res) => res.json({ ResultCode: 0, ResultDesc: 'Accepted' }));

// ─── Pull Transactions result callback ─────────────────────────────────────────
// Safaricom posts pull results here too; we store them for audit/debugging.
router.post(['/mpesa/pull/result', '/pesa/pull/result'], async (req, res) => {
    res.json({ ResponseCode: 0, ResponseMessage: 'Accepted' });
    try { await getMetaDb().collection('mpesa_pull_results').insertOne({ ...req.body, receivedAt: new Date() }); } catch (e) { console.error('[M-PESA] pull result error:', e); }
});

export default router;
