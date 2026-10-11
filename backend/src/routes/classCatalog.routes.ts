/**
 * Classes → Classes we offer: a school ticks the grades/levels it runs from the built-in
 * list (lib/classCatalog) instead of typing a free-text grade name. Ticking a grade creates
 * (or restores) its v2_classes record so it shows up when building a learning class; the
 * school then names its own streams freely (e.g. "Grade 1 N") under New Class.
 *
 * Unticking a grade that has no streams/students yet removes it outright (same "hard delete,
 * no history to keep" policy classes already use); one already in use is kept but hidden from
 * pickers (offered:false), and comes back if ticked again — it never silently loses real data.
 */
import { Router, Request } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { enforceCrud } from '../lib/permissions';
import { CLASS_CATALOG, CLASS_GROUPS, catalogByKey, classCatalogMatch } from '../lib/classCatalog';

const router = Router();
const db = (req: Request): Db => ((req as any).tenantDb as Db) || getMetaDb();

async function schoolClasses(d: Db) {
    const rows = await d.collection('v2_classes').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
    return rows.map((c: any) => ({ ...c, catalogKey: c.catalogKey || classCatalogMatch(c.name)?.key || null }));
}

// School Profile → School Level (Junior / Senior / All) narrows which CBC bands show up under
// Classes we offer. Secondary (Senior School) carries both the outgoing 8-4-4 Forms and the
// incoming CBC Senior School grades, so it always shows whatever this is set to.
const CBC_JUNIOR_GROUPS = new Set(['Pre-Primary', 'Lower Primary', 'Upper Primary', 'Junior School (Grades 7-9)']);
async function allowedGroups(req: Request): Promise<Set<string> | null> {
    const tenantId = (req as any).tenantContext?.tenantId;
    if (!tenantId) return null;
    let level = '';
    try { const t: any = await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(String(tenantId)) }, { projection: { schoolLevel: 1 } }); level = String(t?.schoolLevel || ''); } catch { /* unrestricted */ }
    if (level === 'Junior') return new Set([...CBC_JUNIOR_GROUPS, 'Secondary (Senior School)']);
    if (level === 'Senior') return new Set(['Secondary (Senior School)']);
    return null;   // 'All' or unset: no filter
}

router.get('/class-catalog', async (req, res) => {
    const d = db(req);
    const [mine, allowed] = await Promise.all([schoolClasses(d), allowedGroups(req)]);
    const byKey = new Map(mine.filter((c: any) => c.catalogKey).map((c: any) => [c.catalogKey, c]));
    const catalog = allowed ? CLASS_CATALOG.filter(c => allowed.has(c.group)) : CLASS_CATALOG;
    res.json({
        groups: allowed ? CLASS_GROUPS.filter(g => allowed.has(g)) : CLASS_GROUPS,
        classes: catalog.map(c => {
            const existing: any = byKey.get(c.key);
            return { ...c, offered: !!existing && existing.offered !== false, classId: existing ? String(existing._id) : null };
        }),
        custom: mine.filter((c: any) => !c.catalogKey && c.offered !== false).map((c: any) => ({ _id: String(c._id), name: c.name, curriculumType: c.curriculumType || c.curriculum || '844' })),
    });
});

router.put('/class-catalog/offered', enforceCrud('classes', 'update'), async (req, res) => {
    const d = db(req);
    const keys = new Set((req.body?.keys || []).map(String).filter((k: string) => catalogByKey.has(k)));
    const [mine, allowed] = await Promise.all([schoolClasses(d), allowedGroups(req)]);
    const byKey = new Map(mine.filter((c: any) => c.catalogKey).map((c: any) => [c.catalogKey, c]));

    const streamCounts = await d.collection('v2_streams').find({ deletedAt: { $exists: false } }, { projection: { classId: 1 } }).toArray().catch(() => []);
    const classIdsWithStreams = new Set(streamCounts.map((s: any) => String(s.classId)));
    const studentClassIds = new Set((await d.collection('students').find({}, { projection: { classId: 1 } }).toArray().catch(() => [])).map((s: any) => String(s.classId)));

    let added = 0, restored = 0, hidden = 0, removed = 0, blocked = 0;
    for (const c of CLASS_CATALOG) {
        if (allowed && !allowed.has(c.group)) continue;   // outside the school's level — never created or touched
        const existing: any = byKey.get(c.key);
        if (keys.has(c.key)) {
            if (!existing) {
                await d.collection('v2_classes').insertOne({
                    name: c.name, code: c.name.replace(/\s+/g, '').toUpperCase().slice(0, 6), level: c.level,
                    curriculumType: c.curriculumType, catalogKey: c.key, capacity: 40, offered: true, isActive: true, createdAt: new Date(),
                });
                added++;
            } else if (existing.offered === false || !existing.catalogKey) {
                await d.collection('v2_classes').updateOne({ _id: existing._id }, { $set: { offered: true, catalogKey: c.key } });
                if (existing.offered === false) restored++;
            }
        } else if (existing && existing.offered !== false) {
            const inUse = classIdsWithStreams.has(String(existing._id)) || studentClassIds.has(String(existing._id));
            if (inUse) { await d.collection('v2_classes').updateOne({ _id: existing._id }, { $set: { offered: false, catalogKey: c.key } }); hidden++; blocked++; }
            else { await d.collection('v2_classes').deleteOne({ _id: existing._id }); removed++; }
        }
    }
    res.json({
        message: `Saved: ${added} added${restored ? `, ${restored} restored` : ''}${hidden ? `, ${hidden} hidden (in use)` : ''}${removed ? `, ${removed} removed` : ''}`,
        added, restored, hidden, removed, blocked,
    });
});

export default router;
