import { Db, ObjectId } from 'mongodb';

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
    shortcode: string;
    passkey: string;
    txType: string;                 // CustomerPayBillOnline | CustomerBuyGoodsOnline
    initiator?: string;             // for Transaction Status / B2C
    securityCredential?: string;    // pre-encrypted (school generates from cert)
    callbackBase: string;           // platform-level
    enabled?: boolean;
}

const baseFor = (env: string) => env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

export const platformCallbackBase = () => (process.env.MPESA_CALLBACK_URL || '').replace(/\/$/, '');

/** Resolve a tenant's M-PESA config from its `mpesa_settings` doc (env as fallback). */
export const resolveMpesaConfig = async (db: Db): Promise<MpesaConfig> => {
    let s: any = {};
    try { s = (await db.collection('mpesa_settings').findOne({})) || {}; } catch { /* ignore */ }
    const env = (s.env || process.env.MPESA_ENV || 'sandbox').toLowerCase() as 'sandbox' | 'production';
    return {
        env,
        base: baseFor(env),
        key: s.consumerKey || process.env.MPESA_CONSUMER_KEY || '',
        secret: s.consumerSecret || process.env.MPESA_CONSUMER_SECRET || '',
        shortcode: s.shortcode || process.env.MPESA_SHORTCODE || '',
        passkey: s.passkey || process.env.MPESA_PASSKEY || '',
        txType: s.txType || process.env.MPESA_TX_TYPE || 'CustomerPayBillOnline',
        initiator: s.initiator || process.env.MPESA_INITIATOR || '',
        securityCredential: s.securityCredential || process.env.MPESA_SECURITY_CREDENTIAL || '',
        callbackBase: platformCallbackBase(),
        enabled: s.enabled !== false,
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

export async function getAccessToken(c: MpesaConfig): Promise<string> {
    if (!c.key || !c.secret) throw new Error('M-PESA is not configured for this school.');
    const cached = tokenCache.get(c.key);
    if (cached && cached.expires > Date.now() + 60_000) return cached.token;

    const resp = await fetch(`${c.base}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${b64(`${c.key}:${c.secret}`)}` },
    });
    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.access_token) throw new Error(data?.errorMessage || `Failed to obtain M-PESA token (HTTP ${resp.status})`);
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
    const { ok, status, data } = await daraja(c, '/mpesa/stkpush/v1/processrequest', {
        BusinessShortCode: c.shortcode, Password: password, Timestamp: ts, TransactionType: c.txType,
        Amount: Math.max(1, Math.round(amount)), PartyA: msisdn, PartyB: c.shortcode, PhoneNumber: msisdn,
        CallBackURL: callbackUrl, AccountReference: String(accountRef || 'Fees').slice(0, 12), TransactionDesc: (description || 'Fees payment').slice(0, 20),
    });
    if (!ok || data?.ResponseCode !== '0') throw new Error(data?.errorMessage || data?.ResponseDescription || `STK push failed (HTTP ${status})`);
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

export async function registerC2BUrls(c: MpesaConfig, validationUrl: string, confirmationUrl: string, responseType: 'Completed' | 'Cancelled' = 'Completed') {
    const { ok, status, data } = await daraja(c, '/mpesa/c2b/v2/registerurl', { ShortCode: c.shortcode, ResponseType: responseType, ConfirmationURL: confirmationUrl, ValidationURL: validationUrl });
    if (!ok) throw new Error(data?.errorMessage || `Register URL failed (HTTP ${status})`);
    return data;
}

export const parseStkCallback = (stk: any) => {
    const items: any[] = stk?.CallbackMetadata?.Item || [];
    const m: Record<string, any> = {};
    items.forEach((i: any) => { m[i.Name] = i.Value; });
    return { amount: m.Amount, mpesaReceiptNumber: m.MpesaReceiptNumber, phoneNumber: m.PhoneNumber, transactionDate: m.TransactionDate };
};

/** Record a confirmed M-PESA payment into a tenant DB and update its invoice. */
export async function applyMpesaPayment(db: Db, opts: { studentId?: string; studentName?: string; invoiceId?: string; amount: number; receipt: string; phone?: string }) {
    const receiptNo = opts.receipt ? `MP${opts.receipt}` : `MP${Date.now().toString().slice(-8)}`;
    await db.collection('payments').insertOne({
        receipt_no: receiptNo, student_id: opts.studentId, studentId: opts.studentId, studentName: opts.studentName,
        amount: Number(opts.amount), method: 'MPESA', payment_mode: 'M-PESA', reference: opts.receipt,
        phone: opts.phone, invoice_id: opts.invoiceId, status: 'Completed', createdAt: new Date(),
    }).catch(() => {});

    if (opts.invoiceId) {
        try {
            const inv = await db.collection('invoices').findOne({ _id: new ObjectId(opts.invoiceId) });
            if (inv) {
                const newPaid = Number(inv.paid_amount || inv.amount_paid || 0) + Number(opts.amount);
                const newBal = Math.max(0, Number(inv.total_due || inv.amount || 0) - newPaid);
                await db.collection('invoices').updateOne({ _id: inv._id }, { $set: { paid_amount: newPaid, amount_paid: newPaid, balance: newBal, status: newBal <= 0 ? 'PAID' : 'PARTIAL', updatedAt: new Date() } });
            }
        } catch { /* ignore */ }
    }
}
