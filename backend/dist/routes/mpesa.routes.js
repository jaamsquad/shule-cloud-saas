"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongodb_1 = require("../lib/mongodb");
const mpesa_service_1 = require("../services/mpesa.service");
const wallet_service_1 = require("../services/wallet.service");
const router = (0, express_1.Router)();
// ─── STK Push callback ──────────────────────────────────────────────────────────
// Answers at both /mpesa/callback (configured URL) and /mpesa/stk-callback (alias).
router.post(['/mpesa/callback', '/mpesa/stk-callback'], async (req, res) => {
    // Always acknowledge so Safaricom stops retrying.
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    try {
        const stk = req.body?.Body?.stkCallback;
        if (!stk)
            return;
        const meta = (0, mongodb_1.getMetaDb)();
        const txn = await meta.collection('mpesa_transactions').findOne({ checkoutRequestId: stk.CheckoutRequestID });
        if (!txn)
            return;
        if (Number(stk.ResultCode) === 0) {
            const m = (0, mpesa_service_1.parseStkCallback)(stk);
            // Guard against double-credit (callback + status poll).
            const upd = await meta.collection('mpesa_transactions').updateOne({ _id: txn._id, applied: { $ne: true } }, { $set: { status: 'completed', applied: true, mpesaReceipt: m.mpesaReceiptNumber, resultDesc: stk.ResultDesc, completedAt: new Date() } });
            if (upd.modifiedCount > 0 && txn.tenantDbName) {
                const tdb = (0, mongodb_1.getTenantDb)(txn.tenantDbName);
                if (txn.purpose === 'wallet') {
                    await (0, wallet_service_1.creditWallet)(tdb, txn.studentId, m.amount || txn.amount, { source: 'M-PESA', reference: m.mpesaReceiptNumber, by: 'mpesa' });
                }
                else {
                    await (0, mpesa_service_1.applyMpesaPayment)(tdb, {
                        studentId: txn.studentId, studentName: txn.studentName, registrationNo: txn.registrationNo, invoiceId: txn.invoiceId,
                        amount: m.amount || txn.amount, receipt: m.mpesaReceiptNumber, phone: String(m.phoneNumber || txn.phone || ''),
                    });
                }
            }
        }
        else {
            await meta.collection('mpesa_transactions').updateOne({ _id: txn._id }, { $set: { status: 'failed', resultCode: stk.ResultCode, resultDesc: stk.ResultDesc, completedAt: new Date() } });
        }
    }
    catch (e) {
        console.error('[M-PESA] stk-callback error:', e);
    }
});
// ─── C2B validation (accept all by default) ────────────────────────────────────
router.post('/mpesa/c2b/validation', (_req, res) => {
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});
// ─── C2B confirmation ──────────────────────────────────────────────────────────
router.post('/mpesa/c2b/confirmation', async (req, res) => {
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    try {
        const p = req.body || {};
        const meta = (0, mongodb_1.getMetaDb)();
        await meta.collection('mpesa_c2b_payments').insertOne({ ...p, receivedAt: new Date() });
        // Best-effort: match the BillRefNumber (account = student reg no) to a student in any active tenant.
        const ref = p.BillRefNumber;
        if (ref) {
            const tenants = await meta.collection('Tenant').find({ status: 'active' }).toArray();
            for (const t of tenants) {
                const dbName = t.databaseName;
                if (!dbName)
                    continue;
                try {
                    const db = (0, mongodb_1.getTenantDb)(dbName);
                    const student = await db.collection('students').findOne({ $or: [{ registrationNo: ref }, { admNo: ref }] });
                    if (student) {
                        await (0, mpesa_service_1.applyMpesaPayment)(db, { studentId: String(student._id), studentName: student.studentName, registrationNo: ref, amount: Number(p.TransAmount), receipt: p.TransID, phone: p.MSISDN });
                        break;
                    }
                }
                catch { /* try next tenant */ }
            }
        }
    }
    catch (e) {
        console.error('[M-PESA] c2b confirmation error:', e);
    }
});
// ─── Transaction Status result callback (reconciliation) ───────────────────────
router.post('/mpesa/transaction-status/result', async (req, res) => {
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    try {
        await (0, mongodb_1.getMetaDb)().collection('mpesa_status_results').insertOne({ ...req.body, receivedAt: new Date() });
    }
    catch (e) {
        console.error('[M-PESA] txn-status result error:', e);
    }
});
router.post('/mpesa/timeout', (_req, res) => res.json({ ResultCode: 0, ResultDesc: 'Accepted' }));
exports.default = router;
