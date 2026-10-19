import { Db, ObjectId } from 'mongodb';

const oid = (id: any): ObjectId | null => { try { return new ObjectId(String(id)); } catch { return null; } };

export interface Wallet {
    _id?: any;
    walletId: string;
    code: string;            // for QR / barcode
    studentId: string;
    studentName?: string;
    balance: number;
    status: 'Active' | 'Frozen' | 'Suspended';
    dailyLimit?: number;
    weeklyLimit?: number;
    monthlyLimit?: number;
    allowFeePayment?: boolean;
    allowCanteen?: boolean;
    parentApprovalRequired?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface WalletSettings { enabled: boolean }

/** School-wide wallet settings (single doc). Deposits (not spending) are blocked when disabled. */
export const getWalletSettings = async (db: Db): Promise<WalletSettings> => {
    const doc = await db.collection('wallet_settings').findOne({}).catch(() => null);
    return { enabled: doc?.enabled !== false };   // default: enabled
};

export const saveWalletSettings = async (db: Db, patch: Partial<WalletSettings>): Promise<WalletSettings> => {
    const current = await getWalletSettings(db);
    const next: WalletSettings = { ...current, ...patch };
    await db.collection('wallet_settings').updateOne({}, { $set: next }, { upsert: true });
    return next;
};

/** Find or create a student's wallet. */
export const ensureWallet = async (db: Db, studentId: string): Promise<Wallet> => {
    let wallet = await db.collection('wallets').findOne({ studentId: String(studentId) });
    if (!wallet) {
        let studentName: string | undefined;
        const sid = oid(studentId);
        if (sid) {
            const s = await db.collection('students').findOne({ _id: sid }).catch(() => null);
            studentName = s?.studentName;
        }
        const short = String(studentId).slice(-6).toUpperCase();
        const doc: Wallet = {
            walletId: `WAL-${short}`, code: `SCW${short}`, studentId: String(studentId), studentName,
            balance: 0, status: 'Active', allowFeePayment: true, allowCanteen: true,
            createdAt: new Date(), updatedAt: new Date(),
        };
        const r = await db.collection('wallets').insertOne(doc as any);
        wallet = { ...doc, _id: r.insertedId };
    }
    return wallet as Wallet;
};

const recordTxn = (db: Db, wallet: Wallet, t: {
    type: 'credit' | 'debit'; amount: number; balanceBefore: number; balanceAfter: number;
    source?: string; category?: string; description?: string; reference?: string; status?: string; by?: string;
}) => db.collection('wallet_transactions').insertOne({
    walletId: wallet.walletId, studentId: wallet.studentId, studentName: wallet.studentName,
    ...t, status: t.status || 'Completed', createdAt: new Date(),
}).catch(() => {});

/** Spending recorded within the last N days (for limit checks). */
const spentSince = async (db: Db, walletId: string, days: number): Promise<number> => {
    const since = new Date(Date.now() - days * 86400000);
    const rows = await db.collection('wallet_transactions')
        .find({ walletId, type: 'debit', createdAt: { $gte: since } }).toArray().catch(() => []);
    return rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
};

/** Credit a wallet (top-up / bursary / scholarship). */
export const creditWallet = async (db: Db, studentId: string, amount: number, opts: { source?: string; reference?: string; description?: string; by?: string } = {}) => {
    const amt = Number(amount);
    if (!amt || amt <= 0) throw new Error('A valid top-up amount is required');
    const wallet = await ensureWallet(db, studentId);
    const before = Number(wallet.balance || 0);
    const after = before + amt;
    await db.collection('wallets').updateOne({ _id: wallet._id }, { $set: { balance: after, updatedAt: new Date() } });
    await recordTxn(db, wallet, { type: 'credit', amount: amt, balanceBefore: before, balanceAfter: after, source: opts.source || 'Top-Up', description: opts.description || 'Wallet top-up', reference: opts.reference, by: opts.by });
    return { ...wallet, balance: after };
};

/** Debit a wallet (canteen / fees / trips). Enforces status, balance and daily limit. */
export const debitWallet = async (db: Db, studentId: string, amount: number, opts: { category?: string; description?: string; reference?: string; by?: string } = {}) => {
    const amt = Number(amount);
    if (!amt || amt <= 0) throw new Error('A valid amount is required');
    const wallet = await ensureWallet(db, studentId);
    if (wallet.status !== 'Active') throw new Error(`Wallet is ${wallet.status.toLowerCase()} and cannot be used`);
    if (opts.category === 'Canteen' && wallet.allowCanteen === false) throw new Error('Canteen purchases are blocked on this wallet');
    if (opts.category === 'Fees' && wallet.allowFeePayment === false) throw new Error('Fee payment from wallet is restricted');
    const before = Number(wallet.balance || 0);
    if (amt > before) throw new Error('Insufficient wallet balance');
    if (wallet.dailyLimit && wallet.dailyLimit > 0) {
        const today = await spentSince(db, wallet.walletId, 1);
        if (today + amt > wallet.dailyLimit) throw new Error('Daily spending limit exceeded');
    }
    const after = before - amt;
    await db.collection('wallets').updateOne({ _id: wallet._id }, { $set: { balance: after, updatedAt: new Date() } });
    await recordTxn(db, wallet, { type: 'debit', amount: amt, balanceBefore: before, balanceAfter: after, category: opts.category, description: opts.description, reference: opts.reference, by: opts.by });
    return { ...wallet, balance: after };
};

export const getTransactions = (db: Db, walletId: string, limit = 50) =>
    db.collection('wallet_transactions').find({ walletId }).sort({ createdAt: -1 }).limit(limit).toArray();

export const setWalletStatus = async (db: Db, studentId: string, status: Wallet['status']) => {
    const wallet = await ensureWallet(db, studentId);
    await db.collection('wallets').updateOne({ _id: wallet._id }, { $set: { status, updatedAt: new Date() } });
    return { ...wallet, status };
};

export const setWalletLimits = async (db: Db, studentId: string, limits: Partial<Wallet>) => {
    const wallet = await ensureWallet(db, studentId);
    const allowed = ['dailyLimit', 'weeklyLimit', 'monthlyLimit', 'parentApprovalRequired', 'allowFeePayment', 'allowCanteen'];
    const $set: any = { updatedAt: new Date() };
    allowed.forEach(k => { if ((limits as any)[k] !== undefined) $set[k] = (limits as any)[k]; });
    await db.collection('wallets').updateOne({ _id: wallet._id }, { $set });
    return { ...wallet, ...$set };
};
