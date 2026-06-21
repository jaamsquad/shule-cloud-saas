/**
 * Releases due scheduled SMS jobs. Runs on an interval from server.ts.
 *
 * Scans every tenant that has scheduled jobs due now, flips them to "queued",
 * and notifies that school's connected devices to claim them. Keeps the scan
 * cheap by only touching tenants that actually have due jobs.
 */
import { getMetaDb, getTenantDb, subdomainToDbName } from '../lib/mongodb';
import { notifyDevices } from './smsSocket';

export async function releaseScheduledSms() {
    const now = new Date();
    const tenants = await getMetaDb().collection('Tenant').find({}, { projection: { subdomain: 1, databaseName: 1 } }).toArray().catch(() => []);
    for (const t of tenants) {
        try {
            const dbName = t.databaseName || subdomainToDbName(String(t.subdomain || '').toLowerCase());
            if (!dbName) continue;
            const db = getTenantDb(dbName);
            const res = await db.collection('sms_jobs').updateMany(
                { status: 'scheduled', scheduledAt: { $lte: now } },
                { $set: { status: 'queued', updatedAt: now } },
            );
            if (res.modifiedCount > 0) notifyDevices(t._id.toString(), { count: res.modifiedCount });
        } catch { /* skip this tenant */ }
    }
}
