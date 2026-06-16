"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStkCallback = exports.normalizeMsisdn = exports.isMpesaConfigured = exports.resolveMpesaConfig = exports.platformCallbackBase = void 0;
exports.getAccessToken = getAccessToken;
exports.stkPush = stkPush;
exports.stkQuery = stkQuery;
exports.transactionStatus = transactionStatus;
exports.registerC2BUrls = registerC2BUrls;
exports.initiateStkTopup = initiateStkTopup;
exports.checkStkAndComplete = checkStkAndComplete;
exports.applyMpesaPayment = applyMpesaPayment;
const mongodb_1 = require("mongodb");
const mongodb_2 = require("../lib/mongodb");
const wallet_service_1 = require("./wallet.service");
const baseFor = (env) => env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
const platformCallbackBase = () => (process.env.MPESA_CALLBACK_URL || '').replace(/\/$/, '');
exports.platformCallbackBase = platformCallbackBase;
/**
 * Resolve a tenant's M-PESA config. Sources (in priority order):
 *   1. mpesa_settings (the dedicated M-PESA Integration page)
 *   2. integration_settings { integration: 'daraja' } (the generic Integrations page)
 *   3. environment variables (platform default)
 */
const resolveMpesaConfig = async (db) => {
    let s = {};
    try {
        s = (await db.collection('mpesa_settings').findOne({})) || {};
    }
    catch { /* ignore */ }
    let ig = {};
    try {
        ig = (await db.collection('integration_settings').findOne({ integration: 'daraja' })) || {};
    }
    catch { /* ignore */ }
    const env = String(s.env || ig.environment || ig.env || process.env.MPESA_ENV || 'sandbox').toLowerCase();
    return {
        env,
        base: baseFor(env),
        key: s.consumerKey || ig.consumerKey || process.env.MPESA_CONSUMER_KEY || '',
        secret: s.consumerSecret || ig.consumerSecret || process.env.MPESA_CONSUMER_SECRET || '',
        shortcode: s.shortcode || ig.shortCode || ig.shortcode || process.env.MPESA_SHORTCODE || '',
        passkey: s.passkey || ig.passkey || process.env.MPESA_PASSKEY || '',
        txType: s.txType || ig.txType || process.env.MPESA_TX_TYPE || 'CustomerPayBillOnline',
        initiator: s.initiator || ig.initiator || process.env.MPESA_INITIATOR || '',
        securityCredential: s.securityCredential || ig.securityCredential || process.env.MPESA_SECURITY_CREDENTIAL || '',
        callbackBase: (0, exports.platformCallbackBase)(),
        enabled: s.enabled !== false && ig.enabled !== false,
    };
};
exports.resolveMpesaConfig = resolveMpesaConfig;
const isMpesaConfigured = (c) => !!(c.key && c.secret && c.shortcode && c.passkey);
exports.isMpesaConfigured = isMpesaConfigured;
/** Normalise a Kenyan phone number to 2547XXXXXXXX. */
const normalizeMsisdn = (raw) => {
    let p = String(raw || '').replace(/[^\d]/g, '');
    if (p.startsWith('0'))
        p = '254' + p.slice(1);
    else if (p.startsWith('7') || p.startsWith('1'))
        p = '254' + p;
    return p;
};
exports.normalizeMsisdn = normalizeMsisdn;
const pad = (n) => String(n).padStart(2, '0');
const timestamp = () => { const d = new Date(); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; };
const b64 = (s) => Buffer.from(s).toString('base64');
// ─── OAuth token (cached per consumer key) ──────────────────────────────────────
const tokenCache = new Map();
async function getAccessToken(c) {
    if (!c.key || !c.secret)
        throw new Error('M-PESA is not configured for this school.');
    const cached = tokenCache.get(c.key);
    if (cached && cached.expires > Date.now() + 60000)
        return cached.token;
    const resp = await fetch(`${c.base}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${b64(`${c.key}:${c.secret}`)}` },
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.access_token)
        throw new Error(data?.errorMessage || `Failed to obtain M-PESA token (HTTP ${resp.status})`);
    tokenCache.set(c.key, { token: data.access_token, expires: Date.now() + Number(data.expires_in || 3599) * 1000 });
    return data.access_token;
}
async function daraja(c, path, body) {
    const token = await getAccessToken(c);
    const resp = await fetch(`${c.base}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, data };
}
async function stkPush(c, { phone, amount, accountRef, description, callbackUrl }) {
    if (!(0, exports.isMpesaConfigured)(c))
        throw new Error('M-PESA is not configured for this school.');
    const ts = timestamp();
    const password = b64(`${c.shortcode}${c.passkey}${ts}`);
    const msisdn = (0, exports.normalizeMsisdn)(phone);
    const { ok, status, data } = await daraja(c, '/mpesa/stkpush/v1/processrequest', {
        BusinessShortCode: c.shortcode, Password: password, Timestamp: ts, TransactionType: c.txType,
        Amount: Math.max(1, Math.round(amount)), PartyA: msisdn, PartyB: c.shortcode, PhoneNumber: msisdn,
        CallBackURL: callbackUrl, AccountReference: String(accountRef || 'Fees').slice(0, 12), TransactionDesc: (description || 'Fees payment').slice(0, 20),
    });
    if (!ok || data?.ResponseCode !== '0')
        throw new Error(data?.errorMessage || data?.ResponseDescription || `STK push failed (HTTP ${status})`);
    return { merchantRequestId: data.MerchantRequestID, checkoutRequestId: data.CheckoutRequestID, customerMessage: data.CustomerMessage };
}
async function stkQuery(c, checkoutRequestId) {
    const ts = timestamp();
    const password = b64(`${c.shortcode}${c.passkey}${ts}`);
    const { data } = await daraja(c, '/mpesa/stkpushquery/v1/query', { BusinessShortCode: c.shortcode, Password: password, Timestamp: ts, CheckoutRequestID: checkoutRequestId });
    return data;
}
// ─── Transaction Status (secondary reconciliation) ─────────────────────────────
async function transactionStatus(c, opts) {
    if (!c.initiator || !c.securityCredential)
        throw new Error('Transaction Status requires an Initiator and SecurityCredential in M-PESA settings.');
    const { ok, status, data } = await daraja(c, '/mpesa/transactionstatus/v1/query', {
        Initiator: c.initiator, SecurityCredential: c.securityCredential, CommandID: 'TransactionStatusQuery',
        TransactionID: opts.transactionId, PartyA: c.shortcode, IdentifierType: '4',
        ResultURL: opts.resultUrl, QueueTimeOutURL: opts.queueUrl, Remarks: opts.remarks || 'Status', Occasion: 'OK',
    });
    if (!ok)
        throw new Error(data?.errorMessage || `Transaction status failed (HTTP ${status})`);
    return data;
}
async function registerC2BUrls(c, validationUrl, confirmationUrl, responseType = 'Completed') {
    const { ok, status, data } = await daraja(c, '/mpesa/c2b/v2/registerurl', { ShortCode: c.shortcode, ResponseType: responseType, ConfirmationURL: confirmationUrl, ValidationURL: validationUrl });
    if (!ok)
        throw new Error(data?.errorMessage || `Register URL failed (HTTP ${status})`);
    return data;
}
// Initiate an STK push for a wallet top-up or fee payment and store the txn.
async function initiateStkTopup(db, opts) {
    const cfg = await (0, exports.resolveMpesaConfig)(db);
    if (!(0, exports.isMpesaConfigured)(cfg))
        throw new Error('M-PESA is not configured for this school.');
    if (!cfg.callbackBase)
        throw new Error('M-PESA callback URL is not configured.');
    const purpose = opts.purpose || 'wallet';
    const r = await stkPush(cfg, {
        phone: opts.phone, amount: Number(opts.amount),
        accountRef: opts.accountRef || opts.registrationNo || 'Wallet',
        description: purpose === 'wallet' ? 'Wallet top-up' : 'School fees',
        callbackUrl: `${cfg.callbackBase}/mpesa/callback`,
    });
    await (0, mongodb_2.getMetaDb)().collection('mpesa_transactions').insertOne({
        checkoutRequestId: r.checkoutRequestId, merchantRequestId: r.merchantRequestId, purpose,
        tenantDbName: opts.tenantDbName, studentId: opts.studentId, studentName: opts.studentName,
        registrationNo: opts.registrationNo, invoiceId: opts.invoiceId || null, amount: Number(opts.amount), phone: opts.phone,
        status: 'pending', applied: false, createdAt: new Date(),
    });
    return { checkoutRequestId: r.checkoutRequestId, message: r.customerMessage || 'Enter your M-PESA PIN on the phone to complete.' };
}
// Poll Daraja for an STK transaction and apply it (wallet credit OR fee payment).
async function checkStkAndComplete(db, checkoutRequestId) {
    const meta = (0, mongodb_2.getMetaDb)();
    const txn = await meta.collection('mpesa_transactions').findOne({ checkoutRequestId });
    if (!txn)
        return { status: 'unknown' };
    if (txn.status === 'completed')
        return { status: 'completed', receipt: txn.mpesaReceipt };
    if (txn.status === 'failed')
        return { status: 'failed', message: txn.resultDesc };
    try {
        const cfg = await (0, exports.resolveMpesaConfig)(db);
        const q = await stkQuery(cfg, checkoutRequestId);
        const code = Number(q.ResultCode);
        if (code === 0) {
            const upd = await meta.collection('mpesa_transactions').updateOne({ _id: txn._id, applied: { $ne: true } }, { $set: { status: 'completed', applied: true, resultDesc: q.ResultDesc, completedAt: new Date() } });
            if (upd.modifiedCount > 0) {
                const ref = txn.mpesaReceipt || checkoutRequestId;
                if (txn.purpose === 'wallet')
                    await (0, wallet_service_1.creditWallet)(db, txn.studentId, txn.amount, { source: 'M-PESA', reference: ref, by: 'mpesa' });
                else
                    await applyMpesaPayment(db, { studentId: txn.studentId, studentName: txn.studentName, registrationNo: txn.registrationNo, invoiceId: txn.invoiceId, amount: txn.amount, receipt: ref });
            }
            return { status: 'completed' };
        }
        if (!isNaN(code) && code !== 0) {
            await meta.collection('mpesa_transactions').updateOne({ _id: txn._id }, { $set: { status: 'failed', resultDesc: q.ResultDesc } });
            return { status: 'failed', message: q.ResultDesc };
        }
    }
    catch { /* still processing */ }
    return { status: 'pending' };
}
const parseStkCallback = (stk) => {
    const items = stk?.CallbackMetadata?.Item || [];
    const m = {};
    items.forEach((i) => { m[i.Name] = i.Value; });
    return { amount: m.Amount, mpesaReceiptNumber: m.MpesaReceiptNumber, phoneNumber: m.PhoneNumber, transactionDate: m.TransactionDate };
};
exports.parseStkCallback = parseStkCallback;
const reduceInvoice = (inv, pay) => {
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
async function applyMpesaPayment(db, opts) {
    const amount = Number(opts.amount) || 0;
    const method = opts.method || 'MPESA';
    const receiptNo = opts.receipt ? `${method === 'WALLET' ? 'WL' : 'MP'}${opts.receipt}` : `MP${Date.now().toString().slice(-8)}`;
    await db.collection('payments').insertOne({
        receipt_no: receiptNo, student_id: opts.studentId, studentId: opts.studentId, studentName: opts.studentName,
        registrationNo: opts.registrationNo, amount, method, payment_mode: method === 'WALLET' ? 'Wallet' : 'M-PESA',
        reference: opts.receipt, transactionId: opts.receipt, mpesaCode: method === 'WALLET' ? undefined : opts.receipt,
        phone: opts.phone, invoice_id: opts.invoiceId, status: 'Completed', createdAt: new Date(),
    }).catch(() => { });
    try {
        if (opts.invoiceId) {
            const inv = await db.collection('invoices').findOne({ _id: new mongodb_1.ObjectId(opts.invoiceId) });
            if (inv)
                await db.collection('invoices').updateOne({ _id: inv._id }, { $set: reduceInvoice(inv, amount) });
            return;
        }
        // Allocate across the student's outstanding invoices (oldest first).
        const sid = opts.studentId;
        const match = { $or: [{ studentId: sid }, { student_id: sid }, ...(opts.registrationNo ? [{ registrationNo: opts.registrationNo }] : [])] };
        const invoices = await db.collection('invoices').find(match).sort({ createdAt: 1 }).toArray();
        let remaining = amount;
        for (const inv of invoices) {
            if (remaining <= 0)
                break;
            const bal = Math.max(0, Number(inv.total_due || inv.amount || 0) - Number(inv.paid_amount || inv.amount_paid || 0));
            if (bal <= 0)
                continue;
            const pay = Math.min(bal, remaining);
            await db.collection('invoices').updateOne({ _id: inv._id }, { $set: reduceInvoice(inv, pay) });
            remaining -= pay;
        }
    }
    catch { /* ignore */ }
}
