import { Db } from 'mongodb';
import { getMetaDb, getTenantDb } from '../lib/mongodb';
import { resolveMpesaConfig, isMpesaConfigured, pullTransactions, applyMpesaPayment } from './mpesa.service';

// ─── Scheduled Pull-sync ───────────────────────────────────────────────────────
// Periodically pulls recent transactions from Safaricom for every tenant that has
// the Pull API registered, so the Till/Paybill page stays current without anyone
// clicking "Sync". Mirrors the manual /fees/till-transactions/sync logic.

const num = (v: any) => Number(v) || 0;
const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

/** Pull recent transactions for one tenant DB and upsert/apply them. */
export async function syncTenantPulls(db: Db, opts: { lookbackMinutes?: number } = {}) {
    const cfg = await resolveMpesaConfig(db);
    if (!isMpesaConfigured(cfg) || cfg.env !== 'production') return { imported: 0, skipped: 'not-production' };
    const setRow: any = (await db.collection('mpesa_settings').findOne({})) || {};
    if (!setRow.pullRegistered) return { imported: 0, skipped: 'pull-not-registered' };

    const end = new Date();
    const start = new Date(Date.now() - (opts.lookbackMinutes || 60) * 60 * 1000);
    const meta = getMetaDb();

    const isBuyGoods = cfg.txType === 'CustomerBuyGoodsOnline';
    const candidates = Array.from(new Set([
        ...(isBuyGoods && cfg.tillNumber ? [String(cfg.tillNumber).trim()] : []),
        String(cfg.shortcode).trim(),
        ...(cfg.tillNumber ? [String(cfg.tillNumber).trim()] : []),
    ].filter(Boolean)));

    let imported = 0;
    for (const sc of candidates) {
        let offset = 0, pages = 0, seenHere = 0;
        while (pages < 20) {
            const data: any = await pullTransactions(cfg, fmtDate(start), fmtDate(end), offset, sc).catch(() => null);
            if (!data) break;
            const batch: any[] = (data?.Response && Array.isArray(data.Response[0])) ? data.Response[0] : (Array.isArray(data?.Response) ? data.Response : []);
            if (!batch.length) break;
            pages++; seenHere += batch.length;
            for (const t of batch) {
                const transId = String(t.transactionId || t.TransID || t.receiptNo || '').toUpperCase();
                if (!transId) continue;
                const amount = num(t.amount ?? t.transactionAmount ?? t.TransAmount);
                const msisdn = String(t.msisdn || t.MSISDN || t.phoneNumber || '');
                const acct = String(t.billReferenceNumber || t.BillRefNumber || t.accountReference || '');
                const when = t.trxDate || t.transactionDate || t.TransTime;
                const upd = await meta.collection('mpesa_c2b_payments').updateOne(
                    { TransID: transId },
                    { $setOnInsert: { TransID: transId, BusinessShortCode: sc, TransAmount: amount, MSISDN: msisdn, BillRefNumber: acct, FirstName: t.firstName || '', MiddleName: '', LastName: t.lastName || '', receivedAt: when ? new Date(when) : new Date(), source: 'pull-auto' } },
                    { upsert: true },
                );
                if (upd.upsertedCount) {
                    imported++;
                    if (acct) {
                        const stu = await db.collection('students').findOne({ $or: [{ registrationNo: acct }, { admNo: acct }] }).catch(() => null);
                        if (stu) {
                            const dup = await db.collection('payments').findOne({ is_voided: { $ne: true }, $or: [{ mpesaCode: transId }, { transactionId: transId }] });
                            if (!dup) await applyMpesaPayment(db, { studentId: String(stu._id), studentName: stu.studentName, registrationNo: acct, amount, receipt: transId, phone: msisdn });
                        }
                    }
                }
            }
            offset += batch.length;
        }
        if (seenHere > 0) break;
    }
    return { imported };
}

/** Sweep every active tenant that has Pull registered. Called on a schedule. */
export async function runScheduledPullSync() {
    const meta = getMetaDb();
    const tenants = await meta.collection('Tenant').find({ status: 'active' }).toArray().catch(() => []);
    let total = 0;
    for (const t of tenants) {
        if (!t.databaseName) continue;
        try {
            const r = await syncTenantPulls(getTenantDb(t.databaseName), { lookbackMinutes: 90 });
            total += r.imported || 0;
        } catch { /* isolate per-tenant failures */ }
    }
    if (total) console.log(`[AutoSync] Imported ${total} new M-PESA transaction(s) across tenants.`);
    return total;
}
