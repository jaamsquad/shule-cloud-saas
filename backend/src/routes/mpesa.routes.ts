import { Router } from 'express';
import { getMetaDb, getTenantDb } from '../lib/mongodb';
import { parseStkCallback, applyMpesaPayment, stkResultMessage } from '../services/mpesa.service';
import { creditWallet } from '../services/wallet.service';
import { handleBusinessCallback } from '../services/bizDocs.service';
import { activateSubscription } from '../services/subscription.service';

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
            await activateSubscription(meta, { tenantId: pay.tenantId, planId: pay.planId, planName: pay.planName, amount: pay.amount, receipt: m.mpesaReceiptNumber });
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
            // Not a fee/wallet payment — an invoice paid from its shareable link, or a school subscription payment.
            if (await handleBusinessCallback(meta, stk)) return;
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

// ─── C2B validation ─────────────────────────────────────────────────────────────
// Served at both /mpesa/c2b/validation and /pesa/c2b/validation (Safaricom URL).
// Only invoked by Safaricom if "External Validation" is enabled for the
// shortcode; most schools leave it disabled and Confirmation fires directly.
router.post(['/mpesa/c2b/validation', '/pesa/c2b/validation'], async (req, res) => {
    console.log('[M-PESA][C2B validation] Headers:', req.headers);
    console.log('[M-PESA][C2B validation] Body:', req.body);
    try {
        const { validateC2B } = await import('../services/c2bInbox.service');
        res.json(await validateC2B(req.body || {}));
    } catch (e) {
        console.error('[M-PESA] c2b validation error:', e);
        // Fail open — an internal error here must not cost the customer their payment.
        res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
});

// ─── C2B confirmation ──────────────────────────────────────────────────────────
// Served at both /mpesa/c2b/confirmation and /pesa/c2b/confirmation. This is the
// single source of truth for incoming C2B money — all storage, dedupe, student
// matching, fee allocation, and notifications happen in c2bInbox.service.ts.
router.post(['/mpesa/c2b/confirmation', '/pesa/c2b/confirmation'], async (req, res) => {
    console.log('[M-PESA][C2B confirmation] Headers:', req.headers);
    console.log('[M-PESA][C2B confirmation] Body:', req.body);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });   // ACK Safaricom immediately
    try {
        const { ingestC2B } = await import('../services/c2bInbox.service');
        await ingestC2B(req.body || {}, {
            ip: (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '',
            headers: req.headers,
        });
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
