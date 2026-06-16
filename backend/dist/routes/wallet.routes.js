"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongodb_1 = require("../lib/mongodb");
const wallet_service_1 = require("../services/wallet.service");
const mpesa_service_1 = require("../services/mpesa.service");
const router = (0, express_1.Router)();
const db = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
// List all wallets (with quick balance overview)
router.get('/wallets', async (req, res) => {
    try {
        const wallets = await db(req).collection('wallets').find({}).sort({ updatedAt: -1 }).toArray();
        res.json(wallets);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// Aggregate report
router.get('/wallets/summary', async (req, res) => {
    try {
        const d = db(req);
        const wallets = await d.collection('wallets').find({}).toArray();
        const txns = await d.collection('wallet_transactions').find({}).toArray();
        const totalBalance = wallets.reduce((s, w) => s + Number(w.balance || 0), 0);
        const topups = txns.filter((t) => t.type === 'credit').reduce((s, t) => s + Number(t.amount || 0), 0);
        const spending = txns.filter((t) => t.type === 'debit').reduce((s, t) => s + Number(t.amount || 0), 0);
        res.json({ wallets: wallets.length, totalBalance, topups, spending, frozen: wallets.filter((w) => w.status !== 'Active').length });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.get('/wallets/student/:studentId', async (req, res) => {
    try {
        const wallet = await (0, wallet_service_1.ensureWallet)(db(req), req.params.studentId);
        const transactions = await (0, wallet_service_1.getTransactions)(db(req), wallet.walletId);
        res.json({ wallet, transactions });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.get('/wallets/student/:studentId/transactions', async (req, res) => {
    try {
        const wallet = await (0, wallet_service_1.ensureWallet)(db(req), req.params.studentId);
        res.json(await (0, wallet_service_1.getTransactions)(db(req), wallet.walletId, 200));
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// Top-up is M-PESA only — initiates an STK push; the wallet is credited on confirmation.
router.post('/wallets/student/:studentId/topup', async (req, res) => {
    try {
        const { amount, phone } = req.body || {};
        if (!phone || !amount || Number(amount) <= 0)
            return res.status(400).json({ message: 'An M-PESA phone number and a valid amount are required' });
        const wallet = await (0, wallet_service_1.ensureWallet)(db(req), req.params.studentId);
        const r = await (0, mpesa_service_1.initiateStkTopup)(db(req), {
            tenantDbName: req.tenantContext?.databaseName,
            studentId: req.params.studentId, phone, amount: Number(amount),
            purpose: 'wallet', accountRef: wallet.code, studentName: wallet.studentName,
        });
        res.json(r);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
});
// Poll the status of an admin-initiated wallet top-up.
router.get('/wallets/mpesa-status', async (req, res) => {
    try {
        res.json(await (0, mpesa_service_1.checkStkAndComplete)(db(req), String(req.query.checkoutRequestId || '')));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
});
router.post('/wallets/student/:studentId/deduct', async (req, res) => {
    try {
        const { amount, category, description, reference } = req.body || {};
        const w = await (0, wallet_service_1.debitWallet)(db(req), req.params.studentId, amount, { category, description, reference, by: 'admin' });
        res.json(w);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
});
router.post('/wallets/student/:studentId/status', async (req, res) => {
    try {
        const { status } = req.body || {};
        if (!['Active', 'Frozen', 'Suspended'].includes(status))
            return res.status(400).json({ message: 'Invalid status' });
        res.json(await (0, wallet_service_1.setWalletStatus)(db(req), req.params.studentId, status));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
});
router.post('/wallets/student/:studentId/limits', async (req, res) => {
    try {
        res.json(await (0, wallet_service_1.setWalletLimits)(db(req), req.params.studentId, req.body || {}));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
});
exports.default = router;
