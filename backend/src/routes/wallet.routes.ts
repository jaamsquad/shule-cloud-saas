import { Router } from 'express';
import { getMetaDb } from '../lib/mongodb';
import {
    ensureWallet, creditWallet, debitWallet, getTransactions, setWalletStatus, setWalletLimits,
} from '../services/wallet.service';

const router = Router();
const db = (req: any) => req.tenantDb || getMetaDb();

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

router.post('/wallets/student/:studentId/topup', async (req, res) => {
    try {
        const { amount, source, reference } = req.body || {};
        const w = await creditWallet(db(req), req.params.studentId, amount, { source: source || 'Cash Deposit', reference, by: 'admin' });
        res.json(w);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
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
