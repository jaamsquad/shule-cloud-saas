import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getMetaDb, getTenantDb } from '../lib/mongodb';
import {
    reverseTransaction, b2cPayment, transactionStatus, stkQuery,
    platformCallbackBaseV1, applyMpesaPayment, stkResultMessage, parseStkCallback,
} from '../services/mpesa.service';
import { getAccount, getDefaultAccount, toConfig, listAccounts } from '../services/mpesaAccounts.service';
import { creditWallet } from '../services/wallet.service';
import { creditSmsWallet } from '../services/smsWallet.service';

// ─── M-PESA operations ─────────────────────────────────────────────────────────
// School-admin surfaces for the Daraja operations that go beyond collection:
//   • TransactionReversal — ask Safaricom to reverse a confirmed C2B/STK payment
//   • B2C disbursement    — pay a parent/staff member out (optional, feature-flagged)
//   • Transaction Status  — on-demand reconciliation of a pending STK or C2B code
// Plus a super-admin cross-tenant monitoring surface for the ShuleCloud platform.
//
// Every tenant op resolves the right mpesa_account against this school and uses
// its credentials — never a sibling tenant's.

const router = Router();

// ─── Auth helpers ───────────────────────────────────────────────────────────────
function getUser(req: Request): { id: string; role: string; name?: string } | null {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) return null;
    try {
        const d: any = jwt.verify(h.slice(7), process.env.JWT_SECRET || 'secret');
        return { id: String(d.id || d.sub || ''), role: String(d.role || '').toUpperCase(), name: d.name };
    } catch { return null; }
}

function requireAdmin(req: Request, res: Response, next: any) {
    const u = getUser(req);
    if (!u) return res.status(401).json({ message: 'Not authenticated.' });
    if (!/ADMIN|OWNER|BURSAR|SUPER/i.test(u.role)) return res.status(403).json({ message: 'Admin only.' });
    (req as any).user = u; next();
}

function requireOwnerToken(req: Request, res: Response, next: any) {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) return res.status(401).json({ message: 'Not authenticated.' });
    try {
        const d: any = jwt.verify(h.slice(7), process.env.OWNER_JWT_SECRET || 'owner_secret');
        if (d?.type !== 'owner') return res.status(403).json({ message: 'Owner only.' });
        (req as any).owner = d; next();
    } catch { return res.status(401).json({ message: 'Invalid token.' }); }
}

function tenantDb(req: Request) {
    if (req.tenantDb) return req.tenantDb;
    throw new Error('No tenant context.');
}

async function resolveAccount(req: Request, accountId?: string) {
    const db = tenantDb(req);
    const acc = accountId ? await getAccount(db, accountId) : await getDefaultAccount(db);
    if (!acc) throw new Error('No M-PESA account configured for this school.');
    return acc;
}

// ─── POST /mpesa/ops/reverse ────────────────────────────────────────────────────
// Initiate a Daraja TransactionReversal. The soft reversal on the payment record
// is handled by c2bInbox.service.reverse (fees.routes.ts) and gives the student
// their balance back immediately; this endpoint is for schools whose Daraja app
// has the Reversal product and want the money actually clawed back on Safaricom's
// side too.
router.post('/mpesa/ops/reverse', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { transactionId, amount, accountId, reason } = req.body || {};
        if (!transactionId || !amount) return res.status(400).json({ message: 'transactionId and amount are required.' });
        const reasonTxt = String(reason || '').trim();
        if (!reasonTxt) return res.status(400).json({ message: 'A reason is required for every reversal.' });

        const acc = await resolveAccount(req, accountId);
        const cfg = toConfig(acc);
        const base = platformCallbackBaseV1();
        if (!base) return res.status(400).json({ message: 'MPESA_CALLBACK_URL is not configured on this server.' });

        const meta = getMetaDb();
        const user = (req as any).user as { name?: string; id: string };
        const tenant = (req as any).tenantContext;

        // Pre-record the reversal attempt so the callback has a row to update.
        const doc = {
            tenantDbName: tenant?.databaseName,
            tenantSubdomain: tenant?.tenantSubdomain,
            accountId: acc._id,
            transactionId: String(transactionId).toUpperCase(),
            amount: Number(amount),
            reason: reasonTxt,
            requestedBy: user.name || user.id,
            status: 'pending',
            createdAt: new Date(),
        };
        const ins = await meta.collection('mpesa_reversals').insertOne(doc);

        try {
            const resp = await reverseTransaction(cfg, {
                transactionId: doc.transactionId, amount: doc.amount,
                resultUrl: `${base}/pesa/reversal/result`, queueUrl: `${base}/pesa/timeout`,
                remarks: reasonTxt.slice(0, 100),
            });
            await meta.collection('mpesa_reversals').updateOne(
                { _id: ins.insertedId },
                { $set: { conversationId: resp?.ConversationID, originatorConversationId: resp?.OriginatorConversationID, requestResponse: resp, requestedAt: new Date() } },
            );
            res.json({ ok: true, message: 'Reversal requested. Safaricom will post the result shortly.', conversationId: resp?.ConversationID });
        } catch (e: any) {
            await meta.collection('mpesa_reversals').updateOne({ _id: ins.insertedId }, { $set: { status: 'request_failed', error: e.message, completedAt: new Date() } });
            res.status(400).json({ message: e.message });
        }
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

// ─── GET /mpesa/ops/reversals ───────────────────────────────────────────────────
router.get('/mpesa/ops/reversals', requireAdmin, async (req: Request, res: Response) => {
    try {
        const tenant = (req as any).tenantContext;
        const rows = await getMetaDb().collection('mpesa_reversals')
            .find({ tenantDbName: tenant?.databaseName }).sort({ createdAt: -1 }).limit(200).toArray();
        res.json({ data: rows });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

// ─── POST /mpesa/ops/b2c ───────────────────────────────────────────────────────
// Outgoing payment — refund to a parent, reimbursement to a staff member, etc.
// Guarded by an explicit tenant feature flag (mpesa_settings.b2cEnabled). The
// Daraja app also needs the B2C product and an operator cert.
router.post('/mpesa/ops/b2c', requireAdmin, async (req: Request, res: Response) => {
    try {
        const db = tenantDb(req);
        const settings = await db.collection('mpesa_settings').findOne({}).catch(() => null) as any;
        if (!settings?.b2cEnabled) return res.status(403).json({ message: 'B2C disbursement is disabled for this school. Enable it in M-PESA settings once Safaricom has approved the B2C product on your paybill.' });

        const { phone, amount, commandId, remarks, occasion, accountId } = req.body || {};
        if (!phone || !amount) return res.status(400).json({ message: 'phone and amount are required.' });

        const acc = await resolveAccount(req, accountId);
        const cfg = toConfig(acc);
        const base = platformCallbackBaseV1();
        if (!base) return res.status(400).json({ message: 'MPESA_CALLBACK_URL is not configured.' });

        const meta = getMetaDb();
        const tenant = (req as any).tenantContext;
        const user = (req as any).user as { name?: string; id: string };
        const doc = {
            tenantDbName: tenant?.databaseName, tenantSubdomain: tenant?.tenantSubdomain,
            accountId: acc._id,
            phone: String(phone), amount: Number(amount),
            commandId: commandId || 'BusinessPayment',
            remarks: String(remarks || 'Payment').slice(0, 100),
            occasion: String(occasion || '').slice(0, 100),
            requestedBy: user.name || user.id,
            status: 'pending', createdAt: new Date(),
        };
        const ins = await meta.collection('mpesa_b2c').insertOne(doc);

        try {
            const resp = await b2cPayment(cfg, {
                phone: doc.phone, amount: doc.amount,
                commandId: doc.commandId as any,
                resultUrl: `${base}/pesa/b2c/result`, queueUrl: `${base}/pesa/timeout`,
                remarks: doc.remarks, occasion: doc.occasion,
            });
            await meta.collection('mpesa_b2c').updateOne(
                { _id: ins.insertedId },
                { $set: { conversationId: resp?.ConversationID, originatorConversationId: resp?.OriginatorConversationID, requestResponse: resp, requestedAt: new Date() } },
            );
            res.json({ ok: true, message: 'Disbursement requested.', conversationId: resp?.ConversationID });
        } catch (e: any) {
            await meta.collection('mpesa_b2c').updateOne({ _id: ins.insertedId }, { $set: { status: 'request_failed', error: e.message, completedAt: new Date() } });
            res.status(400).json({ message: e.message });
        }
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.get('/mpesa/ops/b2c', requireAdmin, async (req: Request, res: Response) => {
    try {
        const tenant = (req as any).tenantContext;
        const rows = await getMetaDb().collection('mpesa_b2c')
            .find({ tenantDbName: tenant?.databaseName }).sort({ createdAt: -1 }).limit(200).toArray();
        res.json({ data: rows });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

// ─── POST /mpesa/ops/status-query ──────────────────────────────────────────────
// On-demand status check. Prefers StkQuery for pending STK transactions (fast,
// in-band), falls back to TransactionStatusQuery (async, posts to the result URL
// callback already registered in mpesa.routes.ts).
router.post('/mpesa/ops/status-query', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { checkoutRequestId, transactionId, accountId } = req.body || {};
        if (!checkoutRequestId && !transactionId) return res.status(400).json({ message: 'checkoutRequestId or transactionId required.' });

        const acc = await resolveAccount(req, accountId);
        const cfg = toConfig(acc);
        const base = platformCallbackBaseV1();

        if (checkoutRequestId) {
            const data = await stkQuery(cfg, String(checkoutRequestId));
            // Reconcile — if STK succeeded but our row is still pending, apply it now.
            const meta = getMetaDb();
            const txn = await meta.collection('mpesa_transactions').findOne({ checkoutRequestId });
            if (txn && Number(data?.ResultCode) === 0 && !txn.applied) {
                const synthetic = { ResultCode: 0, ResultDesc: data?.ResultDesc, CallbackMetadata: { Item: [
                    { Name: 'Amount', Value: txn.amount },
                    { Name: 'MpesaReceiptNumber', Value: data?.MpesaReceiptNumber || `S${Date.now().toString().slice(-8)}` },
                    { Name: 'PhoneNumber', Value: txn.phone },
                ] } } as any;
                const upd = await meta.collection('mpesa_transactions').updateOne(
                    { _id: txn._id, applied: { $ne: true } },
                    { $set: { status: 'completed', applied: true, mpesaReceipt: synthetic.CallbackMetadata.Item[1].Value, resultDesc: data?.ResultDesc, completedAt: new Date(), reconciledVia: 'status-query' } },
                );
                if (upd.modifiedCount > 0 && txn.tenantDbName) {
                    const tdb = getTenantDb(txn.tenantDbName);
                    const m = parseStkCallback(synthetic);
                    if (txn.purpose === 'sms') {
                        await creditSmsWallet(tdb, txn.smsCount, { source: 'M-PESA', reference: String(m.mpesaReceiptNumber), description: `Topped up with KSH ${txn.amount}` });
                    } else if (txn.purpose === 'wallet') {
                        await creditWallet(tdb, txn.studentId, Number(m.amount) || txn.amount, { source: 'M-PESA', reference: String(m.mpesaReceiptNumber), by: 'mpesa' });
                    } else {
                        await applyMpesaPayment(tdb, {
                            studentId: txn.studentId, studentName: txn.studentName, registrationNo: txn.registrationNo, invoiceId: txn.invoiceId,
                            amount: Number(m.amount) || txn.amount, receipt: String(m.mpesaReceiptNumber), phone: String(txn.phone || ''),
                        });
                    }
                }
            } else if (txn && Number(data?.ResultCode) && Number(data.ResultCode) !== 0 && !txn.applied) {
                await meta.collection('mpesa_transactions').updateOne(
                    { _id: txn._id },
                    { $set: { status: 'failed', resultCode: Number(data.ResultCode), resultDesc: stkResultMessage(Number(data.ResultCode), data?.ResultDesc), completedAt: new Date() } },
                );
            }
            return res.json({ ok: true, data, humanMessage: stkResultMessage(Number(data?.ResultCode), data?.ResultDesc) });
        }

        if (!base) return res.status(400).json({ message: 'MPESA_CALLBACK_URL is not configured.' });
        const data = await transactionStatus(cfg, {
            transactionId: String(transactionId),
            resultUrl: `${base}/pesa/transaction-status/result`,
            queueUrl: `${base}/pesa/timeout`,
            remarks: 'Admin status query',
        });
        res.json({ ok: true, async: true, message: 'Status queried. The verdict will land via the result callback.', data });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

// ─── Scheduled sweep: reconcile pending STK transactions ───────────────────────
// Runs from server.ts every 2 minutes. For each tenant's pending STK (older than
// 60s, newer than 2h) run stkQuery against the matching account and apply the
// verdict so the user doesn't have to wait for Safaricom to redeliver a lost
// callback. Exported for use by both the scheduler and manual admin triggers.
export async function sweepPendingStk(): Promise<{ scanned: number; reconciled: number; errors: number }> {
    const meta = getMetaDb();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000);
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const pending = await meta.collection('mpesa_transactions').find({
        status: { $in: ['pending', 'initiated'] }, applied: { $ne: true },
        createdAt: { $gte: twoHoursAgo, $lte: oneMinuteAgo },
        checkoutRequestId: { $exists: true },
    }).limit(100).toArray();

    let reconciled = 0, errors = 0;
    for (const txn of pending) {
        try {
            if (!txn.tenantDbName) continue;
            const tdb = getTenantDb(txn.tenantDbName);
            const acc = txn.accountId
                ? await getAccount(tdb, String(txn.accountId))
                : await getDefaultAccount(tdb);
            if (!acc) continue;
            const data = await stkQuery(toConfig(acc), txn.checkoutRequestId);
            const rc = Number(data?.ResultCode);
            if (rc === 0) {
                const synthetic = { ResultCode: 0, CallbackMetadata: { Item: [
                    { Name: 'Amount', Value: txn.amount },
                    { Name: 'MpesaReceiptNumber', Value: data?.MpesaReceiptNumber || `S${Date.now().toString().slice(-8)}` },
                    { Name: 'PhoneNumber', Value: txn.phone },
                ] } } as any;
                const upd = await meta.collection('mpesa_transactions').updateOne(
                    { _id: txn._id, applied: { $ne: true } },
                    { $set: { status: 'completed', applied: true, mpesaReceipt: synthetic.CallbackMetadata.Item[1].Value, completedAt: new Date(), reconciledVia: 'sweep' } },
                );
                if (upd.modifiedCount > 0) {
                    const m = parseStkCallback(synthetic);
                    if (txn.purpose === 'sms') {
                        await creditSmsWallet(tdb, txn.smsCount, { source: 'M-PESA', reference: String(m.mpesaReceiptNumber), description: `Topped up with KSH ${txn.amount}` });
                    } else if (txn.purpose === 'wallet') {
                        await creditWallet(tdb, txn.studentId, Number(m.amount) || txn.amount, { source: 'M-PESA', reference: String(m.mpesaReceiptNumber), by: 'mpesa' });
                    } else {
                        await applyMpesaPayment(tdb, {
                            studentId: txn.studentId, studentName: txn.studentName, registrationNo: txn.registrationNo, invoiceId: txn.invoiceId,
                            amount: Number(m.amount) || txn.amount, receipt: String(m.mpesaReceiptNumber), phone: String(txn.phone || ''),
                        });
                    }
                    reconciled++;
                }
            } else if (rc && rc !== 0 && rc !== 1032 /* user cancelled still may update */) {
                // Terminal failure — mark it so the UI stops spinning.
                await meta.collection('mpesa_transactions').updateOne(
                    { _id: txn._id, status: { $in: ['pending', 'initiated'] } },
                    { $set: { status: 'failed', resultCode: rc, resultDesc: stkResultMessage(rc, data?.ResultDesc), completedAt: new Date(), reconciledVia: 'sweep' } },
                );
            }
        } catch (e) { errors++; /* keep going — one bad tenant must not stop the sweep */ }
    }
    return { scanned: pending.length, reconciled, errors };
}

// ─── Super-admin: cross-tenant monitoring ──────────────────────────────────────
// Lives under /api/v1/owner/mpesa/... — platform-level M-PESA health across every
// tenant. Reveals NO secrets — only counts, status, callback health. For the
// ShuleCloud super-admin dashboard.
router.get('/owner/mpesa/overview', requireOwnerToken, async (_req: Request, res: Response) => {
    try {
        const meta = getMetaDb();
        const since24h = new Date(Date.now() - 24 * 60 * 60_000);
        const since30d = new Date(Date.now() - 30 * 24 * 60 * 60_000);

        const [tenants, stk24h, stk30d, c2b24h, c2b30d, reversals24h, b2c24h, pending, unmatched] = await Promise.all([
            meta.collection('Tenant').find({ status: 'active' }).project({ _id: 1, subdomain: 1, databaseName: 1, name: 1 }).toArray(),
            meta.collection('mpesa_transactions').countDocuments({ createdAt: { $gte: since24h } }),
            meta.collection('mpesa_transactions').countDocuments({ createdAt: { $gte: since30d } }),
            meta.collection('c2b_inbox').countDocuments({ receivedAt: { $gte: since24h } }),
            meta.collection('c2b_inbox').countDocuments({ receivedAt: { $gte: since30d } }),
            meta.collection('mpesa_reversals').countDocuments({ createdAt: { $gte: since24h } }),
            meta.collection('mpesa_b2c').countDocuments({ createdAt: { $gte: since24h } }),
            meta.collection('mpesa_transactions').countDocuments({ status: { $in: ['pending', 'initiated'] }, applied: { $ne: true } }),
            meta.collection('c2b_inbox').countDocuments({ status: 'unmatched' }),
        ]);

        // Last successful STK/C2B per tenant — a proxy for "callbacks are reaching us".
        const perTenant = await Promise.all(tenants.map(async (t: any) => {
            const [stkOk, stkFail, c2bOk, lastStkAt, lastC2bAt] = await Promise.all([
                meta.collection('mpesa_transactions').countDocuments({ tenantDbName: t.databaseName, status: 'completed', createdAt: { $gte: since30d } }),
                meta.collection('mpesa_transactions').countDocuments({ tenantDbName: t.databaseName, status: 'failed', createdAt: { $gte: since30d } }),
                meta.collection('c2b_inbox').countDocuments({ tenantDbName: t.databaseName, receivedAt: { $gte: since30d } }),
                meta.collection('mpesa_transactions').find({ tenantDbName: t.databaseName, status: 'completed' }).sort({ completedAt: -1 }).limit(1).toArray(),
                meta.collection('c2b_inbox').find({ tenantDbName: t.databaseName }).sort({ receivedAt: -1 }).limit(1).toArray(),
            ]);
            return {
                tenantId: t._id, subdomain: t.subdomain, name: t.name,
                stkOk, stkFail, c2bOk,
                lastStkAt: lastStkAt[0]?.completedAt || null,
                lastC2bAt: lastC2bAt[0]?.receivedAt || null,
            };
        }));

        res.json({
            data: {
                totals: { stk24h, stk30d, c2b24h, c2b30d, reversals24h, b2c24h, pending, unmatched },
                tenants: perTenant.sort((a, b) => (b.stkOk + b.c2bOk) - (a.stkOk + a.c2bOk)),
                asOf: new Date(),
            },
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/owner/mpesa/errors', requireOwnerToken, async (_req: Request, res: Response) => {
    try {
        const meta = getMetaDb();
        const since7d = new Date(Date.now() - 7 * 24 * 60 * 60_000);
        const rows = await meta.collection('mpesa_transactions')
            .find({ status: 'failed', completedAt: { $gte: since7d } })
            .project({ tenantDbName: 1, resultCode: 1, resultDesc: 1, amount: 1, completedAt: 1, purpose: 1 })
            .sort({ completedAt: -1 }).limit(500).toArray();
        res.json({ data: rows });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/owner/mpesa/sweep-now', requireOwnerToken, async (_req: Request, res: Response) => {
    try { res.json({ ok: true, result: await sweepPendingStk() }); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
