import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import {
    MpesaConfig, isMpesaConfigured, platformCallbackBase, platformCallbackBaseV1,
    stkPush, stkQuery, applyMpesaPayment, stkResultMessage,
} from './mpesa.service';
import { creditWallet } from './wallet.service';

// ─── M-PESA — multiple accounts per school ──────────────────────────────────────
// A school can register more than one Paybill/Till (e.g. one for tuition, one for
// transport/uniform) in the `mpesa_accounts` collection — each a full, independent
// set of Daraja credentials. Exactly one is the DEFAULT, used wherever an action
// doesn't ask the operator to pick an account explicitly (parent/student portal
// top-ups, background jobs, the "Verify" ping on a manually-recorded Till payment).

const baseFor = (env: string) => env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
const trim = (v: any) => String(v || '').trim();
const COLLECTION = 'mpesa_accounts';

export interface MpesaAccount {
    _id: ObjectId;
    name: string;
    env: 'sandbox' | 'production';
    shortcode: string;
    tillNumber?: string;
    passkey: string;
    txType: string;
    consumerKey: string;
    consumerSecret: string;
    c2bConsumerKey?: string;
    c2bConsumerSecret?: string;
    initiator?: string;
    securityCredential?: string;
    enabled: boolean;
    isDefault: boolean;
    urlsRegistered?: boolean;
    registeredShortCode?: string;
    registeredAt?: Date;
    pullRegistered?: boolean;
    pullNominatedNumber?: string;
    pullRegisteredAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

/** Build the Daraja-ready config for one account. */
export function toConfig(a: MpesaAccount): MpesaConfig {
    const env = (a.env === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production';
    return {
        env, base: baseFor(env),
        key: trim(a.consumerKey), secret: trim(a.consumerSecret),
        shortcode: trim(a.shortcode), tillNumber: trim(a.tillNumber),
        passkey: trim(a.passkey), txType: trim(a.txType) || 'CustomerPayBillOnline',
        initiator: trim(a.initiator), securityCredential: trim(a.securityCredential),
        callbackBase: platformCallbackBase(), enabled: a.enabled !== false,
        c2bKey: trim(a.c2bConsumerKey), c2bSecret: trim(a.c2bConsumerSecret),
    };
}

export async function listAccounts(db: Db): Promise<MpesaAccount[]> {
    return db.collection<MpesaAccount>(COLLECTION).find({}).sort({ createdAt: 1 }).toArray();
}

export async function getAccount(db: Db, id: string): Promise<MpesaAccount | null> {
    try { return await db.collection<MpesaAccount>(COLLECTION).findOne({ _id: new ObjectId(id) }); }
    catch { return null; }
}

/** The account used when nothing explicitly picks one. */
export async function getDefaultAccount(db: Db): Promise<MpesaAccount | null> {
    const all = await listAccounts(db);
    if (!all.length) return null;
    return all.find(a => a.isDefault && a.enabled !== false) || all.find(a => a.enabled !== false) || all[0];
}

export async function createAccount(db: Db, body: any): Promise<MpesaAccount> {
    const now = new Date();
    const existing = await listAccounts(db);
    const doc: any = {
        name: trim(body.name) || `M-PESA Account ${existing.length + 1}`,
        env: body.env === 'production' ? 'production' : 'sandbox',
        shortcode: trim(body.shortcode), tillNumber: trim(body.tillNumber),
        passkey: trim(body.passkey), txType: trim(body.txType) || 'CustomerPayBillOnline',
        consumerKey: trim(body.consumerKey), consumerSecret: trim(body.consumerSecret),
        c2bConsumerKey: trim(body.c2bConsumerKey), c2bConsumerSecret: trim(body.c2bConsumerSecret),
        initiator: trim(body.initiator), securityCredential: trim(body.securityCredential),
        enabled: body.enabled !== false,
        isDefault: !existing.length || !!body.isDefault,   // the first account is always the default
        createdAt: now, updatedAt: now,
    };
    const r = await db.collection(COLLECTION).insertOne(doc);
    if (doc.isDefault) await db.collection(COLLECTION).updateMany({ _id: { $ne: r.insertedId } }, { $set: { isDefault: false } });
    return { ...doc, _id: r.insertedId };
}

export async function updateAccount(db: Db, id: string, body: any): Promise<MpesaAccount | null> {
    const oid = new ObjectId(id);
    const $set: any = { updatedAt: new Date() };
    ['name', 'env', 'shortcode', 'tillNumber', 'passkey', 'txType', 'initiator'].forEach(k => { if (body[k] !== undefined) $set[k] = typeof body[k] === 'string' ? trim(body[k]) : body[k]; });
    if (body.enabled !== undefined) $set.enabled = !!body.enabled;
    // Secrets: only overwrite when a non-empty value is provided (avoid wiping on save).
    ['consumerKey', 'consumerSecret', 'c2bConsumerKey', 'c2bConsumerSecret', 'securityCredential'].forEach(k => {
        if (typeof body[k] === 'string' && body[k].trim()) $set[k] = body[k].trim();
    });
    await db.collection(COLLECTION).updateOne({ _id: oid }, { $set });
    if (body.isDefault) await setDefaultAccount(db, id);
    return getAccount(db, id);
}

export async function deleteAccount(db: Db, id: string): Promise<void> {
    const oid = new ObjectId(id);
    const acc = await getAccount(db, id);
    await db.collection(COLLECTION).deleteOne({ _id: oid });
    // Promote another enabled account to default so the school always has one
    // while any accounts remain — nothing silently becomes unreachable.
    if (acc?.isDefault) {
        const next = await db.collection<MpesaAccount>(COLLECTION).findOne({ enabled: { $ne: false } }, { sort: { createdAt: 1 } });
        if (next) await db.collection(COLLECTION).updateOne({ _id: next._id }, { $set: { isDefault: true } });
    }
}

export async function setDefaultAccount(db: Db, id: string): Promise<void> {
    const oid = new ObjectId(id);
    await db.collection(COLLECTION).updateMany({}, { $set: { isDefault: false } });
    await db.collection(COLLECTION).updateOne({ _id: oid }, { $set: { isDefault: true, updatedAt: new Date() } });
}

const last4 = (s?: string) => (s ? `••••${String(s).slice(-4)}` : '');

/** Safe shape for the frontend — never the raw secrets, only masked hints. */
export function maskAccount(a: MpesaAccount) {
    return {
        _id: String(a._id), name: a.name, env: a.env, shortcode: a.shortcode, tillNumber: a.tillNumber || '',
        txType: a.txType, initiator: a.initiator || '', enabled: a.enabled !== false, isDefault: !!a.isDefault,
        consumerKeyMask: last4(a.consumerKey), consumerSecretSet: !!a.consumerSecret, passkeySet: !!a.passkey,
        c2bConsumerKeyMask: last4(a.c2bConsumerKey), c2bConsumerSecretSet: !!a.c2bConsumerSecret,
        securityCredentialSet: !!a.securityCredential,
        configured: isMpesaConfigured(toConfig(a)),
        callbackBase: platformCallbackBaseV1(),
        registered: !!a.urlsRegistered, registeredShortCode: a.registeredShortCode || '',
        pullRegistered: !!a.pullRegistered, pullNominatedNumber: a.pullNominatedNumber || '',
        reconciliationReady: !!(a.initiator && a.securityCredential),
    };
}

/** Every shortcode/till/registered number this school's accounts are known by —
 * used to match an incoming C2B confirmation or a Pull query to an account. */
export function accountCodes(a: MpesaAccount): string[] {
    return [...new Set([a.shortcode, a.tillNumber, a.registeredShortCode].map(v => trim(v)).filter(Boolean))];
}

// ─── STK top-ups (wallet / student portal) — account-aware ─────────────────────
// mpesa_transactions (meta DB, matches the existing STK callback lookup in
// mpesa.routes.ts) now carries accountId so a later status poll queries the SAME
// account's Daraja app that the push was sent from.

export async function initiateStkTopup(db: Db, opts: { tenantDbName: string; studentId: string; phone: string; amount: number; purpose?: 'wallet' | 'fees'; accountRef?: string; studentName?: string; registrationNo?: string; invoiceId?: string; accountId?: string }) {
    const account = opts.accountId ? await getAccount(db, opts.accountId) : await getDefaultAccount(db);
    if (!account) throw new Error('M-PESA is not configured for this school.');
    const cfg = toConfig(account);
    if (!isMpesaConfigured(cfg)) throw new Error('M-PESA is not configured for this school.');
    if (!cfg.callbackBase) throw new Error('M-PESA callback URL is not configured.');
    const purpose = opts.purpose || 'wallet';
    const r = await stkPush(cfg, {
        phone: opts.phone, amount: Number(opts.amount),
        accountRef: opts.accountRef || opts.registrationNo || 'Wallet',
        description: purpose === 'wallet' ? 'Wallet top-up' : 'School fees',
        callbackUrl: `${platformCallbackBaseV1()}/mpesa/callback`,
    });
    await getMetaDb().collection('mpesa_transactions').insertOne({
        checkoutRequestId: r.checkoutRequestId, merchantRequestId: r.merchantRequestId, purpose,
        tenantDbName: opts.tenantDbName, studentId: opts.studentId, studentName: opts.studentName,
        registrationNo: opts.registrationNo, invoiceId: opts.invoiceId || null, amount: Number(opts.amount), phone: opts.phone,
        accountId: String(account._id),
        status: 'pending', applied: false, createdAt: new Date(),
    });
    return { checkoutRequestId: r.checkoutRequestId, message: r.customerMessage || 'Enter your M-PESA PIN on the phone to complete.' };
}

export async function checkStkAndComplete(db: Db, checkoutRequestId: string) {
    const meta = getMetaDb();
    const txn = await meta.collection('mpesa_transactions').findOne({ checkoutRequestId });
    if (!txn) return { status: 'unknown' as const };
    if (txn.status === 'completed') return { status: 'completed' as const, receipt: txn.mpesaReceipt };
    if (txn.status === 'failed') return { status: 'failed' as const, message: txn.resultDesc };
    try {
        const account = txn.accountId ? await getAccount(db, txn.accountId) : await getDefaultAccount(db);
        if (!account) return { status: 'pending' as const };
        const cfg = toConfig(account);
        const q: any = await stkQuery(cfg, checkoutRequestId);
        const code = Number(q.ResultCode);
        console.log('[mpesa] STK query result:', JSON.stringify({ id: checkoutRequestId, ResultCode: q.ResultCode, ResultDesc: q.ResultDesc, errorMessage: q.errorMessage }));
        if (code === 0) {
            // The query confirms success but doesn't carry the receipt — that comes
            // from the callback (stored as mpesaReceipt). Re-read to pick it up.
            const fresh = await meta.collection('mpesa_transactions').findOne({ _id: txn._id });
            const receipt = fresh?.mpesaReceipt || txn.mpesaReceipt || null;
            const upd = await meta.collection('mpesa_transactions').updateOne(
                { _id: txn._id, applied: { $ne: true } },
                { $set: { status: 'completed', applied: true, resultDesc: q.ResultDesc, completedAt: new Date() } },
            );
            if (upd.modifiedCount > 0) {
                const ref = receipt || checkoutRequestId;
                if (txn.purpose === 'wallet') await creditWallet(db, txn.studentId, txn.amount, { source: 'M-PESA', reference: ref, by: 'mpesa' });
                else await applyMpesaPayment(db, { studentId: txn.studentId, studentName: txn.studentName, registrationNo: txn.registrationNo, invoiceId: txn.invoiceId, amount: txn.amount, receipt: ref });
            }
            return { status: 'completed' as const, receipt };
        }
        // Daraja STK-query codes that mean "still being processed" — NOT a failure.
        // The success/failure is then confirmed by the callback (or a later query).
        // 1037 = no PIN entered yet / timeout pending; 1032 here can also appear
        // transiently. Anything in the 500.001.1001 family is "processing".
        const stillProcessing = code === 1037 || /processing|being processed|500\.001\.1001/i.test(String(q.ResultDesc || q.errorMessage || ''));
        if (!isNaN(code) && code !== 0 && !stillProcessing) {
            const msg = stkResultMessage(code, q.ResultDesc);
            await meta.collection('mpesa_transactions').updateOne({ _id: txn._id }, { $set: { status: 'failed', resultDesc: msg } });
            return { status: 'failed' as const, message: msg };
        }
    } catch { /* query failed transiently — treat as still pending */ }
    return { status: 'pending' as const };
}
