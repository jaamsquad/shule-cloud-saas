import { Router } from 'express';
import { getMetaDb } from '../lib/mongodb';
import { parseStkCallback } from '../services/mpesa.service';
import { creditSmsWallet } from '../services/smsWallet.service';
import { handleBusinessCallback } from '../services/bizDocs.service';
import { activateSubscription } from '../services/subscription.service';

const router = Router();

// NOTE: school-side M-PESA (fee collection, wallet top-ups, Till/Paybill C2B
// capture) has been removed. What remains here is strictly the PLATFORM's own
// M-PESA — ShuleCloud's own paybill, used to collect subscription payments
// from schools and SMS-wallet purchases (see owner.controller.ts,
// business.routes.ts, smsWallet.routes.ts for where it's configured/used).

// Finalize a school's subscription when its STK payment completes.
async function handleSubscriptionCallback(meta: any, stk: any) {
    const pay = await meta.collection('subscription_payments').findOne({ checkoutRequestId: stk.CheckoutRequestID });
    if (!pay) { console.warn('[M-PESA] callback for unknown checkoutRequestId:', stk.CheckoutRequestID); return; }

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

// Finalize an SMS-wallet purchase when its STK payment completes.
async function handleSmsPurchaseCallback(meta: any, stk: any, txn: any) {
    if (Number(stk.ResultCode) !== 0) {
        await meta.collection('mpesa_transactions').updateOne({ _id: txn._id }, { $set: { status: 'failed', resultCode: stk.ResultCode, resultDesc: stk.ResultDesc, completedAt: new Date() } });
        return;
    }
    const m = parseStkCallback(stk);
    const upd = await meta.collection('mpesa_transactions').updateOne(
        { _id: txn._id, applied: { $ne: true } },
        { $set: { status: 'completed', applied: true, mpesaReceipt: m.mpesaReceiptNumber, resultDesc: stk.ResultDesc, completedAt: new Date() } },
    );
    if (upd.modifiedCount > 0 && txn.tenantDbName) {
        const { getTenantDb } = await import('../lib/mongodb');
        const tdb = getTenantDb(txn.tenantDbName);
        await creditSmsWallet(tdb, txn.smsCount, { source: 'M-PESA', reference: m.mpesaReceiptNumber, description: `Topped up with KSH ${txn.amount}` });
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

        // SMS-wallet purchases (platform-level).
        const txn = await meta.collection('mpesa_transactions').findOne({ checkoutRequestId: stk.CheckoutRequestID, purpose: 'sms' });
        if (txn) { await handleSmsPurchaseCallback(meta, stk, txn); return; }

        // An invoice paid from its shareable link, or a school subscription payment.
        if (await handleBusinessCallback(meta, stk)) return;
        await handleSubscriptionCallback(meta, stk);
    } catch (e) {
        console.error('[M-PESA] stk-callback error:', e);
    }
});

router.post(['/mpesa/timeout', '/pesa/timeout'], (_req, res) => res.json({ ResultCode: 0, ResultDesc: 'Accepted' }));

export default router;
