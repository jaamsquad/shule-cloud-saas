"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setWalletLimits = exports.setWalletStatus = exports.getTransactions = exports.debitWallet = exports.creditWallet = exports.ensureWallet = void 0;
const mongodb_1 = require("mongodb");
const oid = (id) => { try {
    return new mongodb_1.ObjectId(String(id));
}
catch {
    return null;
} };
/** Find or create a student's wallet. */
const ensureWallet = async (db, studentId) => {
    let wallet = await db.collection('wallets').findOne({ studentId: String(studentId) });
    if (!wallet) {
        let studentName;
        const sid = oid(studentId);
        if (sid) {
            const s = await db.collection('students').findOne({ _id: sid }).catch(() => null);
            studentName = s?.studentName;
        }
        const short = String(studentId).slice(-6).toUpperCase();
        const doc = {
            walletId: `WAL-${short}`, code: `SCW${short}`, studentId: String(studentId), studentName,
            balance: 0, status: 'Active', allowFeePayment: true, allowCanteen: true,
            createdAt: new Date(), updatedAt: new Date(),
        };
        const r = await db.collection('wallets').insertOne(doc);
        wallet = { ...doc, _id: r.insertedId };
    }
    return wallet;
};
exports.ensureWallet = ensureWallet;
const recordTxn = (db, wallet, t) => db.collection('wallet_transactions').insertOne({
    walletId: wallet.walletId, studentId: wallet.studentId, studentName: wallet.studentName,
    ...t, status: t.status || 'Completed', createdAt: new Date(),
}).catch(() => { });
/** Spending recorded within the last N days (for limit checks). */
const spentSince = async (db, walletId, days) => {
    const since = new Date(Date.now() - days * 86400000);
    const rows = await db.collection('wallet_transactions')
        .find({ walletId, type: 'debit', createdAt: { $gte: since } }).toArray().catch(() => []);
    return rows.reduce((s, r) => s + Number(r.amount || 0), 0);
};
/** Credit a wallet (top-up / bursary / scholarship). */
const creditWallet = async (db, studentId, amount, opts = {}) => {
    const amt = Number(amount);
    if (!amt || amt <= 0)
        throw new Error('A valid top-up amount is required');
    const wallet = await (0, exports.ensureWallet)(db, studentId);
    const before = Number(wallet.balance || 0);
    const after = before + amt;
    await db.collection('wallets').updateOne({ _id: wallet._id }, { $set: { balance: after, updatedAt: new Date() } });
    await recordTxn(db, wallet, { type: 'credit', amount: amt, balanceBefore: before, balanceAfter: after, source: opts.source || 'Top-Up', description: opts.description || 'Wallet top-up', reference: opts.reference, by: opts.by });
    return { ...wallet, balance: after };
};
exports.creditWallet = creditWallet;
/** Debit a wallet (canteen / fees / trips). Enforces status, balance and daily limit. */
const debitWallet = async (db, studentId, amount, opts = {}) => {
    const amt = Number(amount);
    if (!amt || amt <= 0)
        throw new Error('A valid amount is required');
    const wallet = await (0, exports.ensureWallet)(db, studentId);
    if (wallet.status !== 'Active')
        throw new Error(`Wallet is ${wallet.status.toLowerCase()} and cannot be used`);
    if (opts.category === 'Canteen' && wallet.allowCanteen === false)
        throw new Error('Canteen purchases are blocked on this wallet');
    if (opts.category === 'Fees' && wallet.allowFeePayment === false)
        throw new Error('Fee payment from wallet is restricted');
    const before = Number(wallet.balance || 0);
    if (amt > before)
        throw new Error('Insufficient wallet balance');
    if (wallet.dailyLimit && wallet.dailyLimit > 0) {
        const today = await spentSince(db, wallet.walletId, 1);
        if (today + amt > wallet.dailyLimit)
            throw new Error('Daily spending limit exceeded');
    }
    const after = before - amt;
    await db.collection('wallets').updateOne({ _id: wallet._id }, { $set: { balance: after, updatedAt: new Date() } });
    await recordTxn(db, wallet, { type: 'debit', amount: amt, balanceBefore: before, balanceAfter: after, category: opts.category, description: opts.description, reference: opts.reference, by: opts.by });
    return { ...wallet, balance: after };
};
exports.debitWallet = debitWallet;
const getTransactions = (db, walletId, limit = 50) => db.collection('wallet_transactions').find({ walletId }).sort({ createdAt: -1 }).limit(limit).toArray();
exports.getTransactions = getTransactions;
const setWalletStatus = async (db, studentId, status) => {
    const wallet = await (0, exports.ensureWallet)(db, studentId);
    await db.collection('wallets').updateOne({ _id: wallet._id }, { $set: { status, updatedAt: new Date() } });
    return { ...wallet, status };
};
exports.setWalletStatus = setWalletStatus;
const setWalletLimits = async (db, studentId, limits) => {
    const wallet = await (0, exports.ensureWallet)(db, studentId);
    const allowed = ['dailyLimit', 'weeklyLimit', 'monthlyLimit', 'parentApprovalRequired', 'allowFeePayment', 'allowCanteen'];
    const $set = { updatedAt: new Date() };
    allowed.forEach(k => { if (limits[k] !== undefined)
        $set[k] = limits[k]; });
    await db.collection('wallets').updateOne({ _id: wallet._id }, { $set });
    return { ...wallet, ...$set };
};
exports.setWalletLimits = setWalletLimits;
