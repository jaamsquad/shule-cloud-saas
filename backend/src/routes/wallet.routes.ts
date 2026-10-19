import { Router } from 'express';
import { getMetaDb } from '../lib/mongodb';
import {
    ensureWallet, debitWallet, getTransactions, setWalletStatus, setWalletLimits,
    getWalletSettings, saveWalletSettings,
} from '../services/wallet.service';
import { initiateStkTopup, checkStkAndComplete } from '../services/mpesa.service';

const router = Router();
const db = (req: any) => req.tenantDb || getMetaDb();

// School-wide wallet settings — when disabled, no new deposit can be started
// (existing balances can still be spent, so nothing is stranded).
router.get('/wallets/settings', async (req, res) => {
    try { res.json(await getWalletSettings(db(req))); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/wallets/settings', async (req, res) => {
    try { res.json(await saveWalletSettings(db(req), { enabled: !!req.body?.enabled })); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

// List all wallets (with quick balance overview)
router.get('/wallets', async (req, res) => {
    try {
        const wallets = await db(req).collection('wallets').find({}).sort({ updatedAt: -1 }).toArray();
        res.json(wallets);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Aggregate report
router.get('/wallets/summary', async (req, res) => {
    try {
        const d = db(req);
        const wallets = await d.collection('wallets').find({}).toArray();
        const txns = await d.collection('wallet_transactions').find({}).toArray();
        const totalBalance = wallets.reduce((s: number, w: any) => s + Number(w.balance || 0), 0);
        const topups = txns.filter((t: any) => t.type === 'credit').reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
        const spending = txns.filter((t: any) => t.type === 'debit').reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
        res.json({ wallets: wallets.length, totalBalance, topups, spending, frozen: wallets.filter((w: any) => w.status !== 'Active').length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/wallets/student/:studentId', async (req, res) => {
    try {
        const wallet = await ensureWallet(db(req), req.params.studentId);
        const transactions = await getTransactions(db(req), wallet.walletId);
        res.json({ wallet, transactions });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/wallets/student/:studentId/transactions', async (req, res) => {
    try {
        const wallet = await ensureWallet(db(req), req.params.studentId);
        res.json(await getTransactions(db(req), wallet.walletId, 200));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Top-up is M-PESA only — initiates an STK push; the wallet is credited on confirmation.
router.post('/wallets/student/:studentId/topup', async (req, res) => {
    try {
        const { amount, phone } = req.body || {};
        if (!phone || !amount || Number(amount) <= 0) return res.status(400).json({ message: 'An M-PESA phone number and a valid amount are required' });
        if (!(await getWalletSettings(db(req))).enabled) return res.status(400).json({ message: 'Wallet top-ups are currently disabled by the school administrator.' });
        const wallet = await ensureWallet(db(req), req.params.studentId);
        const r = await initiateStkTopup(db(req), {
            tenantDbName: (req as any).tenantContext?.databaseName,
            studentId: req.params.studentId, phone, amount: Number(amount),
            purpose: 'wallet', accountRef: wallet.code, studentName: wallet.studentName,
        });
        res.json(r);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

// Poll the status of an admin-initiated wallet top-up.
router.get('/wallets/mpesa-status', async (req, res) => {
    try { res.json(await checkStkAndComplete(db(req), String(req.query.checkoutRequestId || ''))); }
    catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.post('/wallets/student/:studentId/deduct', async (req, res) => {
    try {
        const { amount, category, description, reference } = req.body || {};
        const w = await debitWallet(db(req), req.params.studentId, amount, { category, description, reference, by: 'admin' });
        res.json(w);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.post('/wallets/student/:studentId/status', async (req, res) => {
    try {
        const { status } = req.body || {};
        if (!['Active', 'Frozen', 'Suspended'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
        res.json(await setWalletStatus(db(req), req.params.studentId, status));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.post('/wallets/student/:studentId/limits', async (req, res) => {
    try {
        res.json(await setWalletLimits(db(req), req.params.studentId, req.body || {}));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

export default router;
