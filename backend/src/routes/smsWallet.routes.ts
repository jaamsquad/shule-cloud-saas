/**
 * SMS credit wallet — tenant-facing.
 *   GET  /sms/wallet                balance + the platform's current KSH → SMS ratio
 *   GET  /sms/wallet/ledger         recent credits/debits
 *   POST /sms/wallet/purchase       M-PESA STK push (to the platform paybill) to buy credits
 *   GET  /sms/wallet/purchase-status   the buy page polls this while the customer enters their PIN
 *
 * Buying SMS uses the exact same M-PESA config as subscription billing (resolveMpesaConfig
 * against the meta DB) — see services/mpesa.service.ts. The owner-configurable ratio and the
 * free welcome bonus live in services/smsWallet.service.ts.
 */
import { Router, Request, Response } from 'express';
import { Db } from 'mongodb';
import { getMetaDb, getTenantDb } from '../lib/mongodb';
import { resolveMpesaConfig, isMpesaConfigured, stkPush, stkQuery, platformCallbackBaseV1, normalizeMsisdn } from '../services/mpesa.service';
import { ensureSmsWallet, getSmsPricing, getSmsWalletLedger, creditSmsWallet } from '../services/smsWallet.service';

const router = Router();
const getRequestDb = (req: Request): Db => (req as any).tenantDb || getMetaDb();
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

router.get('/sms/wallet', async (req: Request, res: Response) => {
    try {
        const [wallet, pricing] = await Promise.all([ensureSmsWallet(getRequestDb(req)), getSmsPricing()]);
        res.json({ balance: wallet.balance, smsPerKsh: pricing.smsPerKsh, welcomeBonus: pricing.welcomeBonus });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/sms/wallet/ledger', async (req: Request, res: Response) => {
    try { res.json(await getSmsWalletLedger(getRequestDb(req))); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Start an STK push to buy SMS credits at the platform's current ratio.
router.post('/sms/wallet/purchase', async (req: Request, res: Response) => {
    try {
        const amountKsh = Math.round(num(req.body?.amountKsh));
        if (!(amountKsh >= 1)) return res.status(400).json({ message: 'Enter an amount of at least KSH 1.' });
        const phone = normalizeMsisdn(String(req.body?.phone || ''));
        if (!/^254(7|1)\d{8}$/.test(phone)) return res.status(400).json({ message: 'Enter a valid Safaricom number, e.g. 0712 345 678.' });

        const meta = getMetaDb();
        const cfg = await resolveMpesaConfig(meta);
        if (!isMpesaConfigured(cfg) || cfg.enabled === false) return res.status(503).json({ message: 'Online payment is not available right now.' });
        const cb = platformCallbackBaseV1();
        if (!cb) return res.status(503).json({ message: 'Online payment is not available right now (callback URL not set).' });

        const pricing = await getSmsPricing();
        const smsCount = Math.floor(amountKsh * pricing.smsPerKsh);
        const tenantDbName = (req as any).tenantContext?.databaseName;

        const r = await stkPush(cfg, { phone, amount: amountKsh, accountRef: 'SMS Credits', description: 'SMS credit top-up', callbackUrl: `${cb}/mpesa/callback` });
        await meta.collection('mpesa_transactions').insertOne({
            checkoutRequestId: r.checkoutRequestId, merchantRequestId: r.merchantRequestId, purpose: 'sms',
            tenantDbName, amount: amountKsh, smsCount, phone, status: 'pending', applied: false, createdAt: new Date(),
        });
        res.json({ checkoutRequestId: r.checkoutRequestId, smsCount, message: r.customerMessage || 'Enter your M-PESA PIN on your phone to complete the payment.' });
    } catch (e: any) { res.status(502).json({ message: e.message || 'Could not start the M-PESA payment.' }); }
});

router.get('/sms/wallet/purchase-status', async (req: Request, res: Response) => {
    try {
        const cid = String(req.query.checkoutRequestId || '');
        if (!cid) return res.json({ status: 'unknown' });
        const meta = getMetaDb();
        let txn: any = await meta.collection('mpesa_transactions').findOne({ checkoutRequestId: cid, purpose: 'sms' });
        if (!txn) return res.json({ status: 'unknown' });
        if (txn.status === 'completed') return res.json({ status: 'completed', smsCount: txn.smsCount });
        if (txn.status === 'failed') return res.json({ status: 'failed', message: txn.resultDesc });

        // Still pending: ask Safaricom directly too, in case the callback never arrives.
        try {
            const cfg = await resolveMpesaConfig(meta);
            const q: any = await stkQuery(cfg, cid);
            const code = Number(q.ResultCode);
            const processing = code === 1037 || /processing|being processed|500\.001\.1001/i.test(String(q.ResultDesc || ''));
            if (String(q.ResultCode) === '0') {
                const upd = await meta.collection('mpesa_transactions').updateOne({ _id: txn._id, applied: { $ne: true } }, { $set: { status: 'completed', applied: true, completedAt: new Date() } });
                if (upd.modifiedCount > 0 && txn.tenantDbName) {
                    await creditSmsWallet(getTenantDb(txn.tenantDbName), txn.smsCount, { source: 'M-PESA', reference: cid, description: `Topped up with KSH ${txn.amount}` });
                }
                return res.json({ status: 'completed', smsCount: txn.smsCount });
            }
            if (!isNaN(code) && code !== 0 && !processing) {
                await meta.collection('mpesa_transactions').updateOne({ _id: txn._id, status: 'pending' }, { $set: { status: 'failed', resultDesc: q.ResultDesc, completedAt: new Date() } });
                return res.json({ status: 'failed', message: q.ResultDesc || 'The payment was not completed.' });
            }
        } catch { /* keep waiting */ }
        res.json({ status: 'pending' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
