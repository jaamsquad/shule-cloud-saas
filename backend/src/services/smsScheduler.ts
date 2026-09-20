/**
 * Releases due scheduled SMS jobs. Runs on an interval from server.ts.
 *
 * Scans every tenant that has scheduled jobs due now, flips them to "queued",
 * and notifies that school's connected devices to claim them. Keeps the scan
 * cheap by only touching tenants that actually have due jobs.
 */
import { getMetaDb, getTenantDb, subdomainToDbName } from '../lib/mongodb';
import { dispatchJobs } from './smsGateway.service';

export async function releaseScheduledSms() {
    const now = new Date();
    const tenants = await getMetaDb().collection('Tenant').find({}, { projection: { subdomain: 1, databaseName: 1 } }).toArray().catch(() => []);
    for (const t of tenants) {
        try {
            const dbName = t.databaseName || subdomainToDbName(String(t.subdomain || '').toLowerCase());
            if (!dbName) continue;
            const db = getTenantDb(dbName);
            const due: any[] = await db.collection('sms_jobs').find({ status: 'scheduled', scheduledAt: { $lte: now } }).limit(500).toArray();
            if (!due.length) continue;
            await db.collection('sms_jobs').updateMany({ _id: { $in: due.map(j => j._id) } }, { $set: { status: 'queued', updatedAt: now } });
            // Send through the school's gateways in priority order (Africa's Talking, Talksasa…);
            // if a phone is first in line it is woken up to collect them, as before.
            await dispatchJobs(db, t._id.toString(), due.map(j => ({ _id: j._id, phone: j.phone, message: j.message })));
        } catch { /* skip this tenant */ }
    }
}
