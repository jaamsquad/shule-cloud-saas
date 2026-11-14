/**
 * Keeps a school one academic year ahead automatically. Once the latest known academic year
 * is underway (or approaching its end), the next one is created on its own — Term 1/2/3 carried
 * forward from the latest year's own dates (same month/day, year advanced by one) — so a school
 * never runs out of a "current" year/term to record marks, attendance etc. against. The new
 * year/terms are ordinary editable records (Academic System → Academic Years & Terms); nothing
 * is locked — admins can change dates for just that year same as any other.
 *
 * Hooked in two places: lazily inside cbcTerm.ts's syncCurrentTerm() (so an active school
 * self-heals the moment anyone loads a page that reads terms), and on a background interval
 * (server.ts) for tenants nobody is actively viewing.
 */
import { Db } from 'mongodb';

const toDate = (v: any): Date | null => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const shiftYear = (v: any, years = 1): string | undefined => { const d = toDate(v); if (!d) return undefined; d.setFullYear(d.getFullYear() + years); return iso(d); };

export async function ensureNextAcademicYear(db: Db): Promise<void> {
    const years: any[] = await db.collection('academic_years').find({ deletedAt: { $exists: false } }).sort({ year: -1 }).limit(1).toArray().catch(() => []);
    const latest = years[0];
    if (!latest) return;   // no first year on file yet — the school creates that one by hand, once

    const nextYearNum = Number(latest.year) + 1;
    const already = await db.collection('academic_years').findOne({ year: nextYearNum, deletedAt: { $exists: false } }).catch(() => null);
    if (already) return;   // already created (by hand, or by us earlier) — nothing to do

    // Only create the next year once the latest one has actually begun, and either has no end
    // date yet or is within its final month — never pre-empt a year that hasn't started.
    const now = Date.now();
    const latestStart = toDate(latest.startDate);
    const latestEnd = toDate(latest.endDate);
    if (!latestStart || now < latestStart.getTime()) return;
    if (latestEnd && now < latestEnd.getTime() - 30 * 86_400_000) return;

    const terms: any[] = await db.collection('terms').find({ academicYearId: String(latest._id), deletedAt: { $exists: false } }).sort({ termNumber: 1 }).toArray().catch(() => []);

    const yearResult = await db.collection('academic_years').insertOne({
        year: nextYearNum, name: String(nextYearNum),
        startDate: shiftYear(latest.startDate), endDate: shiftYear(latest.endDate),
        isActive: false, createdAt: new Date(), autoCreated: true,
    });

    const termDocs = terms.length
        ? terms.map(t => ({
            academicYearId: String(yearResult.insertedId), academicYear: nextYearNum,
            name: t.name, termNumber: t.termNumber,
            startDate: shiftYear(t.startDate), endDate: shiftYear(t.endDate),
            isActive: false, createdAt: new Date(), autoCreated: true,
        }))
        : [1, 2, 3].map(n => ({   // nothing to copy — standard Term 1/2/3 shape, dates left for the admin to set
            academicYearId: String(yearResult.insertedId), academicYear: nextYearNum,
            name: `Term ${n}`, termNumber: n, isActive: false, createdAt: new Date(), autoCreated: true,
        }));
    await db.collection('terms').insertMany(termDocs);
}

/**
 * Same check, for every active tenant — the background-interval entry point (see server.ts).
 * Also flips the active term/year itself (cbcTerm.ts's syncCurrentTerm, which includes this
 * same check as its own first step) and, when that actually rolls the year over, auto-promotes
 * students — so a school nobody has logged into since New Year's still advances and promotes
 * on its own, not just the next time someone happens to open the app.
 */
export async function ensureNextAcademicYearAllTenants(): Promise<void> {
    const { getMetaDb, getTenantDb } = await import('./mongodb');
    const { syncCurrentTerm } = await import('../modules/cbc/cbcTerm');
    const tenants: any[] = await getMetaDb().collection('Tenant')
        .find({ status: 'active', databaseName: { $exists: true, $ne: '' } }, { projection: { databaseName: 1 } })
        .toArray().catch(() => []);
    for (const t of tenants) {
        try { await syncCurrentTerm(getTenantDb(t.databaseName)); } catch { /* one tenant's failure must not block the rest */ }
    }
}
