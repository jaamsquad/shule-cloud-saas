/**
 * Keeps a school one academic year ahead automatically. Once the latest known academic year
 * is underway (or approaching its end), the next one is created on its own — Term 1/2/3 carried
 * forward from the latest year's own dates (same month/day, year advanced by one) — so a school
 * never runs out of a "current" year/term to record marks, attendance etc. against. The new
 * year/terms are ordinary editable records (Academic System → Academic Years & Terms); nothing
 * is locked — admins can change dates for just that year same as any other.
 *
 * Also self-heals a GAP: if an admin deletes a term (e.g. "Term 1 2027") the school is now
 * missing part of its forward-looking schedule — "current" quietly falls back to an earlier
 * term (Term 3 2026) with no replacement ahead of it. The next time this runs, the missing
 * term is recreated — same month/day as the matching term the year before, shifted a year
 * forward, exactly like a brand-new year's terms are built — so the school is never left
 * without a full year ahead of it just because one term record was removed.
 *
 * Hooked in two places: lazily inside cbcTerm.ts's syncCurrentTerm() (so an active school
 * self-heals the moment anyone loads a page that reads terms — including right after a term
 * delete, since academics-v2.routes.ts calls syncCurrentTerm there too), and on a background
 * interval (server.ts) for tenants nobody is actively viewing.
 */
import { Db } from 'mongodb';

const toDate = (v: any): Date | null => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const shiftYear = (v: any, years = 1): string | undefined => { const d = toDate(v); if (!d) return undefined; d.setFullYear(d.getFullYear() + years); return iso(d); };

/** Recreates any term `targetYear` is missing that `templateYear` has, dates shifted one year forward. */
async function backfillMissingTerms(db: Db, templateYear: any, targetYear: any): Promise<void> {
    const [templateTerms, targetTerms] = await Promise.all([
        db.collection('terms').find({ academicYearId: String(templateYear._id), deletedAt: { $exists: false } }).toArray().catch(() => [] as any[]),
        db.collection('terms').find({ academicYearId: String(targetYear._id), deletedAt: { $exists: false } }).toArray().catch(() => [] as any[]),
    ]);
    if (!templateTerms.length) return;
    const have = new Set(targetTerms.map((t: any) => Number(t.termNumber)));
    const missing = templateTerms.filter((t: any) => !have.has(Number(t.termNumber)));
    if (!missing.length) return;
    await db.collection('terms').insertMany(missing.map((t: any) => ({
        academicYearId: String(targetYear._id), academicYear: targetYear.year,
        name: t.name, termNumber: t.termNumber,
        startDate: shiftYear(t.startDate), endDate: shiftYear(t.endDate),
        isActive: false, createdAt: new Date(), autoCreated: true, autoRestored: true,
    })));
}

export async function ensureNextAcademicYear(db: Db): Promise<void> {
    const years: any[] = await db.collection('academic_years').find({ deletedAt: { $exists: false } }).sort({ year: -1 }).limit(1).toArray().catch(() => []);
    const latest = years[0];
    if (!latest) return;   // no first year on file yet — the school creates that one by hand, once

    // Self-heal: the latest (furthest-ahead) year on file might be missing a term an admin
    // deleted — recreate it against the year before, using that as the dated template.
    const prevOfLatest: any = await db.collection('academic_years').findOne({ year: Number(latest.year) - 1, deletedAt: { $exists: false } }).catch(() => null);
    if (prevOfLatest) await backfillMissingTerms(db, prevOfLatest, latest);

    const nextYearNum = Number(latest.year) + 1;
    const already = await db.collection('academic_years').findOne({ year: nextYearNum, deletedAt: { $exists: false } }).catch(() => null);
    if (already) { await backfillMissingTerms(db, latest, already); return; }   // already created — just make sure it's complete

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
