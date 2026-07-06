import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { creditWallet } from './wallet.service';

// ─── Safaricom Daraja (M-PESA) integration — PER-TENANT credentials ────────────
// Each school stores its own Daraja credentials (Consumer Key/Secret, Shortcode,
// Passkey, …) via the Integrations page. The platform only provides the public
// callback base URL (env MPESA_CALLBACK_URL), since all callbacks route through
// one platform endpoint and are matched back to the tenant via the stored txn.

export interface MpesaConfig {
    env: 'sandbox' | 'production';
    base: string;
    key: string;
    secret: string;
    shortcode: string;              // Paybill number, OR a Till's Head Office/Store number
    tillNumber?: string;            // Till/Buy Goods only: the actual till number (PartyB)
    passkey: string;
    txType: string;                 // CustomerPayBillOnline | CustomerBuyGoodsOnline
    initiator?: string;             // for Transaction Status / B2C
    securityCredential?: string;    // pre-encrypted (school generates from cert)
    callbackBase: string;           // platform-level
    enabled?: boolean;
}

const baseFor = (env: string) => env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

export const platformCallbackBase = () => (process.env.MPESA_CALLBACK_URL || '').replace(/\/$/, '');

// ALL Safaricom callbacks (STK, C2B, transaction-status, pull) are registered
// under the /v1/ mount — the canonical path. Idempotent: strips any /v1 the
// operator already put in MPESA_CALLBACK_URL so we never produce /v1/v1/.
// Callbacks Safaricom already stored against the old bare-/api paths keep
// working because mpesaRoutes stays mounted at both /api and /api/v1.
export const platformCallbackBaseV1 = () => {
    const b = platformCallbackBase().replace(/\/v1$/, '');
    return b ? `${b}/v1` : '';
};

/**
 * Resolve a tenant's M-PESA config. Sources (in priority order):
 *   1. mpesa_settings (the dedicated M-PESA Integration page)
 *   2. integration_settings { integration: 'daraja' } (the generic Integrations page)
 *   3. environment variables (platform default)
 */
export const resolveMpesaConfig = async (db: Db): Promise<MpesaConfig> => {
    let s: any = {};
    try { s = (await db.collection('mpesa_settings').findOne({})) || {}; } catch { /* ignore */ }
    let ig: any = {};
    try { ig = (await db.collection('integration_settings').findOne({ integration: 'daraja' })) || {}; } catch { /* ignore */ }

    const env = String(s.env || ig.environment || ig.env || process.env.MPESA_ENV || 'sandbox').toLowerCase() as 'sandbox' | 'production';
    // Trim every credential — a pasted Consumer Key/Secret with a trailing
    // space or newline (very easy to pick up from a browser page, PDF, or
    // email) silently breaks the Base64 Basic-Auth header and Safaricom
    // rejects it with an opaque, CONSISTENT (not intermittent) HTTP 400 with
    // an empty body — indistinguishable from a rate limit unless you trim.
    const trim = (v: any) => String(v || '').trim();
    return {
        env,
        base: baseFor(env),
        key: trim(s.consumerKey || ig.consumerKey || process.env.MPESA_CONSUMER_KEY),
        secret: trim(s.consumerSecret || ig.consumerSecret || process.env.MPESA_CONSUMER_SECRET),
        shortcode: trim(s.shortcode || ig.shortCode || ig.shortcode || process.env.MPESA_SHORTCODE),
        tillNumber: trim(s.tillNumber || ig.tillNumber || process.env.MPESA_TILL_NUMBER),
        passkey: trim(s.passkey || ig.passkey || process.env.MPESA_PASSKEY),
        txType: trim(s.txType || ig.txType || process.env.MPESA_TX_TYPE || 'CustomerPayBillOnline'),
        initiator: trim(s.initiator || ig.initiator || process.env.MPESA_INITIATOR),
        securityCredential: trim(s.securityCredential || ig.securityCredential || process.env.MPESA_SECURITY_CREDENTIAL),
        callbackBase: platformCallbackBase(),
        enabled: s.enabled !== false && ig.enabled !== false,
    };
};

export const isMpesaConfigured = (c: MpesaConfig): boolean => !!(c.key && c.secret && c.shortcode && c.passkey);

/** Normalise a Kenyan phone number to 2547XXXXXXXX. */
export const normalizeMsisdn = (raw: string): string => {
    let p = String(raw || '').replace(/[^\d]/g, '');
    if (p.startsWith('0')) p = '254' + p.slice(1);
    else if (p.startsWith('7') || p.startsWith('1')) p = '254' + p;
    return p;
};

const pad = (n: number) => String(n).padStart(2, '0');
const timestamp = () => { const d = new Date(); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; };
const b64 = (s: string) => Buffer.from(s).toString('base64');

// ─── OAuth token (cached per consumer key) ──────────────────────────────────────
const tokenCache = new Map<string, { token: string; expires: number }>();

async function requestNewToken(c: MpesaConfig): Promise<{ ok: boolean; status: number; data: any }> {
    const resp = await fetch(`${c.base}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${b64(`${c.key}:${c.secret}`)}` },
    });
    const data: any = await resp.json().catch(() => ({}));
    return { ok: resp.ok && !!data.access_token, status: resp.status, data };
}

// Consumer Key/Secret should be plain alphanumeric tokens. A stray space,
// newline, or invisible character (easy to pick up copy-pasting from a
// browser/PDF/email) produces a HARD, CONSISTENT failure — not a rate limit —
// and Safaricom's error for it is an opaque empty-body HTTP 400 either way.
// Catch it here so the real cause is obvious instead of looking identical to
// sandbox throttling.
const looksMalformed = (v: string) => /\s/.test(v) || /[^\x20-\x7E]/.test(v);

export async function getAccessToken(c: MpesaConfig): Promise<string> {
    if (!c.key || !c.secret) throw new Error('M-PESA is not configured for this school.');
    if (looksMalformed(c.key) || looksMalformed(c.secret)) {
        throw new Error('Your Consumer Key or Consumer Secret contains whitespace or an invalid character (often from copy-pasting) — re-copy them from your Daraja app and re-save.');
    }
    const cached = tokenCache.get(c.key);
    if (cached && cached.expires > Date.now() + 60_000) return cached.token;

    // Safaricom's OAuth endpoint occasionally 400s a token request that
    // immediately follows another one for the same Consumer Key (e.g. clicking
    // "Test Connection" then "Register C2B URLs" seconds apart) — retry with
    // increasing backoff before surfacing an error. A CONSISTENT failure across
    // all attempts (same status, same empty body) usually means the credentials
    // themselves are wrong for this environment, not a transient rate limit.
    const delays = [1200, 2500, 4000];
    let ok = false, status = 0, data: any = {};
    for (let attempt = 0; attempt <= delays.length; attempt++) {
        ({ ok, status, data } = await requestNewToken(c));
        if (ok) break;
        console.error(`[M-PESA] OAuth token request failed (attempt ${attempt + 1}/${delays.length + 1}):`, JSON.stringify({
            status, base: c.base, env: c.env, keyTail: c.key.slice(-4), response: data,
        }));
        if (attempt < delays.length) await new Promise(r => setTimeout(r, delays[attempt]));
    }
    if (!ok) {
        // Surface Safaricom's actual reason (bad key/secret, IP not whitelisted for
        // production, etc.) instead of a generic "HTTP 400" that hides the cause.
        const reason = data?.errorMessage || data?.error_description || data?.error
            || (Object.keys(data || {}).length === 0
                ? `HTTP ${status} with an empty response — this consistently means Safaricom rejected the Consumer Key/Secret for the "${c.env}" environment (wrong environment, expired/revoked app, or a typo), not a temporary issue`
                : `HTTP ${status}`);
        throw new Error(`Failed to obtain M-PESA token: ${reason}`);
    }
    tokenCache.set(c.key, { token: data.access_token, expires: Date.now() + Number(data.expires_in || 3599) * 1000 });
    return data.access_token;
}

async function daraja(c: MpesaConfig, path: string, body: any) {
    const token = await getAccessToken(c);
    const resp = await fetch(`${c.base}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data: any = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, data };
}

// ─── STK Push ───────────────────────────────────────────────────────────────────
export interface StkPushParams { phone: string; amount: number; accountRef: string; description?: string; callbackUrl: string }

export async function stkPush(c: MpesaConfig, { phone, amount, accountRef, description, callbackUrl }: StkPushParams) {
    if (!isMpesaConfigured(c)) throw new Error('M-PESA is not configured for this school.');
    const ts = timestamp();
    const password = b64(`${c.shortcode}${c.passkey}${ts}`);
    const msisdn = normalizeMsisdn(phone);
    if (!/^254(7|1)\d{8}$/.test(msisdn)) {
        throw new Error(`Invalid M-PESA phone number "${phone}". Use a Safaricom number like 07XXXXXXXX.`);
    }
    // TransactionType must match the shortcode type: Paybill→CustomerPayBillOnline,
    // Till/Buy Goods→CustomerBuyGoodsOnline. A mismatch is the usual cause of
    // Daraja's "unresolved reason type" error.
    const txType = (c.txType || 'CustomerPayBillOnline').trim();
    const isBuyGoods = txType === 'CustomerBuyGoodsOnline';
    // For Buy Goods/Till: BusinessShortCode + password use the Head Office/Store
    // number (c.shortcode), while PartyB is the actual Till number. If no separate
    // till number is set, fall back to the shortcode (works when they're the same).
    const partyB = (isBuyGoods && c.tillNumber) ? c.tillNumber.trim() : c.shortcode;
    const payload = {
        BusinessShortCode: c.shortcode, Password: password, Timestamp: ts, TransactionType: txType,
        Amount: Math.max(1, Math.round(amount)), PartyA: msisdn,
        PartyB: partyB, PhoneNumber: msisdn,
        CallBackURL: callbackUrl, AccountReference: String(accountRef || 'Fees').slice(0, 12), TransactionDesc: (description || 'Fees payment').slice(0, 20),
    };
    const { ok, status, data } = await daraja(c, '/mpesa/stkpush/v1/processrequest', payload);
    if (!ok || data?.ResponseCode !== '0') {
        // Log the full Daraja response so the real cause is visible in server logs.
        console.error('[mpesa] STK push rejected:', JSON.stringify({
            status, response: data, sent: { shortcode: c.shortcode, txType, env: c.env, partyB: payload.PartyB, callbackUrl },
        }));
        const reason = data?.errorMessage || data?.ResponseDescription || `STK push failed (HTTP ${status})`;
        // Add a hint for the most common, otherwise-opaque Daraja error.
        const hint = /unresolved reason type/i.test(String(reason))
            ? ' — check that your M-PESA Shortcode, Passkey and Transaction Type match (Paybill vs Till) in Settings, and belong to the same shortcode.'
            : '';
        throw new Error(reason + hint);
    }
    return { merchantRequestId: data.MerchantRequestID as string, checkoutRequestId: data.CheckoutRequestID as string, customerMessage: data.CustomerMessage as string };
}

export async function stkQuery(c: MpesaConfig, checkoutRequestId: string) {
    const ts = timestamp();
    const password = b64(`${c.shortcode}${c.passkey}${ts}`);
    const { data } = await daraja(c, '/mpesa/stkpushquery/v1/query', { BusinessShortCode: c.shortcode, Password: password, Timestamp: ts, CheckoutRequestID: checkoutRequestId });
    return data;
}

// ─── Transaction Status (secondary reconciliation) ─────────────────────────────
export async function transactionStatus(c: MpesaConfig, opts: { transactionId: string; resultUrl: string; queueUrl: string; remarks?: string }) {
    if (!c.initiator || !c.securityCredential) throw new Error('Transaction Status requires an Initiator and SecurityCredential in M-PESA settings.');
    const { ok, status, data } = await daraja(c, '/mpesa/transactionstatus/v1/query', {
        Initiator: c.initiator, SecurityCredential: c.securityCredential, CommandID: 'TransactionStatusQuery',
        TransactionID: opts.transactionId, PartyA: c.shortcode, IdentifierType: '4',
        ResultURL: opts.resultUrl, QueueTimeOutURL: opts.queueUrl, Remarks: opts.remarks || 'Status', Occasion: 'OK',
    });
    if (!ok) throw new Error(data?.errorMessage || `Transaction status failed (HTTP ${status})`);
    return data;
}

export async function registerC2BUrls(c: MpesaConfig, validationUrl: string, confirmationUrl: string, responseType: 'Completed' | 'Cancelled' = 'Completed', shortCode?: string) {
    // C2B URLs must register to the STORE number (e.g. a Till's store/till number),
    // NOT the Head Office number. Safaricom rejects/ignores registration on the HO.
    // Caller passes the store number explicitly; default to the config shortcode.
    const registerShortCode = String(shortCode || c.shortcode).trim();
    const { ok, status, data } = await daraja(c, '/mpesa/c2b/v2/registerurl', { ShortCode: registerShortCode, ResponseType: responseType, ConfirmationURL: confirmationUrl, ValidationURL: validationUrl });
    if (!ok) throw new Error(data?.errorMessage || `Register URL failed (HTTP ${status})`);
    return { ...data, registeredShortCode: registerShortCode };
}

// ─── Pull Transactions API ─────────────────────────────────────────────────────
// Lets a merchant retrieve the list of completed payments to their shortcode for
// a date range — the proper way to reconcile till/paybill payments that did not
// arrive via the C2B callback. Must be registered once before querying.

/** One-time registration of the shortcode for the Pull API. */
export async function registerPullUrl(c: MpesaConfig, callbackUrl: string, nominatedNumber: string) {
    const { ok, status, data } = await daraja(c, '/pulltransactions/v1/register', {
        ShortCode: c.shortcode, RequestType: 'Pull', NominatedNumber: nominatedNumber, CallBackURL: callbackUrl,
    });
    // "already registered" is a success state.
    if (!ok && !/already.*register/i.test(JSON.stringify(data || ''))) throw new Error(data?.errorMessage || data?.ResponseDescription || `Pull register failed (HTTP ${status})`);
    return data;
}

/** Query transactions to a shortcode between two dates (YYYY-MM-DD HH:mm:ss).
 * Pass `shortCode` to query a specific number (e.g. a Till's PartyB); defaults
 * to the config shortcode. */
export async function pullTransactions(c: MpesaConfig, startDate: string, endDate: string, offset = 0, shortCode?: string) {
    const { ok, status, data } = await daraja(c, '/pulltransactions/v1/query', {
        ShortCode: shortCode || c.shortcode, StartDate: startDate, EndDate: endDate, OffSetValue: String(offset),
    });
    if (!ok) throw new Error(data?.errorMessage || data?.ResponseDescription || `Pull query failed (HTTP ${status})`);
    // Response shape: { ResponseCode, ResponseMessage, Response: [ [ {transactionId, trxDate, msisdn, amount, ...} ] ] }
    return data;
}

// Initiate an STK push for a wallet top-up or fee payment and store the txn.
export async function initiateStkTopup(db: Db, opts: { tenantDbName: string; studentId: string; phone: string; amount: number; purpose?: 'wallet' | 'fees'; accountRef?: string; studentName?: string; registrationNo?: string; invoiceId?: string }) {
    const cfg = await resolveMpesaConfig(db);
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
        status: 'pending', applied: false, createdAt: new Date(),
    });
    return { checkoutRequestId: r.checkoutRequestId, message: r.customerMessage || 'Enter your M-PESA PIN on the phone to complete.' };
}

// Poll Daraja for an STK transaction and apply it (wallet credit OR fee payment).
export async function checkStkAndComplete(db: Db, checkoutRequestId: string) {
    const meta = getMetaDb();
    const txn = await meta.collection('mpesa_transactions').findOne({ checkoutRequestId });
    if (!txn) return { status: 'unknown' as const };
    if (txn.status === 'completed') return { status: 'completed' as const, receipt: txn.mpesaReceipt };
    if (txn.status === 'failed') return { status: 'failed' as const, message: txn.resultDesc };
    try {
        const cfg = await resolveMpesaConfig(db);
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

export const parseStkCallback = (stk: any) => {
    const items: any[] = stk?.CallbackMetadata?.Item || [];
    const m: Record<string, any> = {};
    items.forEach((i: any) => { m[i.Name] = i.Value; });
    return { amount: m.Amount, mpesaReceiptNumber: m.MpesaReceiptNumber, phoneNumber: m.PhoneNumber, transactionDate: m.TransactionDate };
};

/** Turn a Daraja STK ResultCode/Desc into a clear, actionable message. */
export const stkResultMessage = (code: number | string, desc?: string): string => {
    switch (Number(code)) {
        case 0: return 'Payment successful.';
        case 1: return 'Payment failed: insufficient M-PESA balance.';
        case 1032: return 'Payment cancelled by the user.';
        case 1037: return 'No response — the user didn\'t enter their PIN in time, or the phone was unreachable.';
        case 1019: return 'Transaction expired. Please try again.';
        case 2029: return 'M-PESA rejected the request (code 2029). This usually means the Passkey doesn\'t match the Shortcode, or the Transaction Type (Paybill vs Till) is wrong. Verify them in Settings → M-PESA Integration against your Daraja app.';
        default: return desc || `Payment failed (code ${code}).`;
    }
};

const reduceInvoice = (inv: any, pay: number) => {
    const total = Number(inv.total_due || inv.amount || 0);
    const newPaid = Number(inv.paid_amount || inv.amount_paid || 0) + pay;
    const newBal = Math.max(0, total - newPaid);
    return { paid_amount: newPaid, amount_paid: newPaid, balance: newBal, status: newBal <= 0 ? 'PAID' : 'PARTIAL', updatedAt: new Date() };
};

/**
 * Record a confirmed M-PESA payment and reduce the student's balance. With an
 * invoiceId it pays that invoice; otherwise the amount is allocated across the
 * student's outstanding invoices, oldest first. The M-PESA transaction code is
 * stored on the payment record.
 */
export async function applyMpesaPayment(db: Db, opts: { studentId?: string; studentName?: string; registrationNo?: string; invoiceId?: string; amount: number; receipt: string; phone?: string; method?: string }) {
    const amount = Number(opts.amount) || 0;
    const method = opts.method || 'MPESA';
    const receiptNo = opts.receipt ? `${method === 'WALLET' ? 'WL' : 'MP'}${opts.receipt}` : `MP${Date.now().toString().slice(-8)}`;

    await db.collection('payments').insertOne({
        receipt_no: receiptNo, student_id: opts.studentId, studentId: opts.studentId, studentName: opts.studentName,
        registrationNo: opts.registrationNo, amount, method, payment_mode: method === 'WALLET' ? 'Wallet' : 'M-PESA',
        reference: opts.receipt, transactionId: opts.receipt, mpesaCode: method === 'WALLET' ? undefined : opts.receipt,
        phone: opts.phone, invoice_id: opts.invoiceId, status: 'Completed', createdAt: new Date(),
    }).catch(() => {});

    // Auto-post to Accounting (Dr M-PESA/Wallet, Cr Fee Income) so money-in is detected.
    try {
        const year = new Date().getFullYear();
        const n = await db.collection('accounting_journals').countDocuments({ number: new RegExp(`^JV-${year}-`) }).catch(() => 0);
        await db.collection('accounting_journals').insertOne({
            number: `JV-${year}-${String(n + 1).padStart(4, '0')}`, date: new Date(),
            description: `Fee payment ${receiptNo}${opts.studentName ? ' — ' + opts.studentName : ''}`,
            reference: receiptNo, source: 'fees',
            lines: [
                { account: method === 'WALLET' ? 'Wallet' : 'M-PESA', type: 'debit', amount },
                { account: 'Fee Income', type: 'credit', amount },
            ],
            status: 'posted', createdAt: new Date(),
        });
    } catch { /* accounting optional */ }

    try {
        if (opts.invoiceId) {
            const inv = await db.collection('invoices').findOne({ _id: new ObjectId(opts.invoiceId) });
            if (inv) await db.collection('invoices').updateOne({ _id: inv._id }, { $set: reduceInvoice(inv, amount) });
            return;
        }
        // Allocate across the student's outstanding invoices (oldest first).
        const sid = opts.studentId;
        const match: any = { $or: [{ studentId: sid }, { student_id: sid }, ...(opts.registrationNo ? [{ registrationNo: opts.registrationNo }] : [])] };
        const invoices = await db.collection('invoices').find(match).sort({ createdAt: 1 }).toArray();
        let remaining = amount;
        for (const inv of invoices) {
            if (remaining <= 0) break;
            const bal = Math.max(0, Number(inv.total_due || inv.amount || 0) - Number(inv.paid_amount || inv.amount_paid || 0));
            if (bal <= 0) continue;
            const pay = Math.min(bal, remaining);
            await db.collection('invoices').updateOne({ _id: inv._id }, { $set: reduceInvoice(inv, pay) });
            remaining -= pay;
        }
        // Anything left over is an OVERPAYMENT → store as a carry-forward credit
        // (a negative balance) that auto-applies to the next invoice.
        if (remaining > 0) {
            const { addCredit } = await import('./feeCredit.service');
            await addCredit(db, { studentId: opts.studentId, studentName: opts.studentName, registrationNo: opts.registrationNo, amount: remaining, reason: 'Overpayment', receipt: opts.receipt });
        }
    } catch { /* ignore */ }
}
