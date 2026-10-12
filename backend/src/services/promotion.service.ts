/**
 * Automatic class promotion (Grade 1 East → Grade 2 East).
 *
 * A promotion is planned first, then applied. The plan is built from a snapshot of every
 * class, stream and active student, so a run never promotes anyone twice (Grade 1 → 2 and
 * Grade 2 → 3 in the same run do not chain), and anything it cannot place with certainty
 * is left where it is and reported instead of guessed.
 *
 * Where a class goes next:
 *   1. the class is marked final (isFinal)       → its students graduate
 *   2. the class names its next class (nextClassId)
 *   3. the next name: Grade 1 → Grade 2, Form 3 → Form 4, PP2 → Grade 1
 *      (Form 4 / Grade 12 have no next name → graduate)
 *   4. the only class one level up in the same curriculum
 *   otherwise the class is "unresolved" and its students are not touched.
 * Streams keep their name (East → East). A stream missing in the next class is created
 * when createMissingStreams is on, otherwise those students are not touched.
 *
 * Every student moved is recorded in promotion_run_items with their class before the move,
 * so a run can be resumed after a crash (done students are skipped) or reverted.
 */
import { ObjectId } from 'mongodb';
import { buildStatusUpdate, canonicalStatus } from '../lib/studentStatus';

export const nrm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const sid = (v: any) => (v === null || v === undefined ? '' : String(v));
const toOid = (id: any): ObjectId | null => { try { return new ObjectId(String(id)); } catch { return null; } };

export interface PromotionOptions {
    academicYear?: string;              // the year students move into
    classIds?: string[];                // limit to these source classes (empty = all)
    createMissingStreams?: boolean;     // default true
    graduateFinal?: boolean;            // default true
    excludeStudentIds?: string[];       // repeaters / held back
}

/** Grade 1 → Grade 2, Form 4 → null (graduates), PP2 → Grade 1. undefined = no name rule applies. */
export function nextClassName(name: string): string | null | undefined {
    const label = String(name || '').trim();
    const v = label.toLowerCase();
    if (v === 'pp1') return 'PP2';
    if (v === 'pp2') return 'Grade 1';
    const m = label.match(/^(.*?)(\d+)\s*$/);
    if (!m) return undefined;
    const prefix = m[1].trim(); const n = Number(m[2]);
    const cap = /^form/i.test(prefix) ? 4 : /^grade/i.test(prefix) ? 12 : 0;
    if (cap && n >= cap) return null;
    return `${prefix} ${n + 1}`.trim();
}

/** Default target year: promotions set from October onwards are for next year. */
export function defaultTargetYear(at: Date = new Date()): string {
    return String(at.getMonth() >= 9 ? at.getFullYear() + 1 : at.getFullYear());
}

type ClassRoute =
    | { action: 'promote'; toClass: any; via: string }
    | { action: 'graduate'; via: string }
    | { action: 'unresolved'; reason: string };

export function resolveClassRoute(cls: any, classes: any[], graduateFinal = true): ClassRoute {
    const live = classes.filter(c => !c.deletedAt && c.isActive !== false);
    // A class never promotes a student into a different curriculum's classes — in particular
    // CBC's senior school (Grade 10-12) and 8-4-4 (Form 1-4) both sit in the "Secondary (Senior
    // School)" catalog group and can coexist in the same school, so without this guard a name
    // or level coincidence (or a mis-set manual nextClassId) could cross-promote a CBC learner
    // into an 844 class or vice versa. Applies to every route below, including the admin's own
    // manual override.
    const cur = nrm(cls.curriculumType || '844');
    const sameCurriculum = (c: any) => nrm(c.curriculumType || '844') === cur;
    if (cls.isFinal) return graduateFinal ? { action: 'graduate', via: 'Marked as final class' } : { action: 'unresolved', reason: 'Final class (graduation is off for this run)' };
    if (cls.nextClassId) {
        const t = live.find(c => sid(c._id) === sid(cls.nextClassId));
        if (t && sid(t._id) !== sid(cls._id)) {
            if (!sameCurriculum(t)) return { action: 'unresolved', reason: `The class set to follow it (${t.name}) is a different curriculum — update class setup` };
            return { action: 'promote', toClass: t, via: 'Set in class setup' };
        }
        return { action: 'unresolved', reason: 'The class set to follow it no longer exists' };
    }
    const next = nextClassName(cls.name);
    if (next === null) return graduateFinal ? { action: 'graduate', via: 'Top class' } : { action: 'unresolved', reason: 'Top class (graduation is off for this run)' };
    if (next) {
        const byName = live.filter(c => nrm(c.name) === nrm(next) && sid(c._id) !== sid(cls._id) && sameCurriculum(c));
        if (byName.length === 1) return { action: 'promote', toClass: byName[0], via: `Next class by name (${next})` };
        if (byName.length > 1) return { action: 'unresolved', reason: `More than one class is named ${next}` };
    }
    const lvl = Number(cls.level);
    if (Number.isFinite(lvl)) {
        const up = live.filter(c => Number(c.level) === lvl + 1 && sameCurriculum(c) && sid(c._id) !== sid(cls._id));
        if (up.length === 1) return { action: 'promote', toClass: up[0], via: `Next level (${lvl + 1})` };
        if (up.length > 1) return { action: 'unresolved', reason: `Several classes are at level ${lvl + 1} — choose one in class setup` };
        // No class one level up. If this is the highest level the school actually offers in this
        // curriculum (e.g. a CBC school that stops at Grade 9, never ticking Grade 10-12 in Classes
        // We Offer), that's the end of the ladder — graduate — not a data error to leave unresolved.
        const maxLvl = Math.max(0, ...live.filter(sameCurriculum).map(c => Number(c.level) || 0));
        if (lvl >= maxLvl) return graduateFinal ? { action: 'graduate', via: 'Highest class the school offers' } : { action: 'unresolved', reason: 'Highest class offered (graduation is off for this run)' };
    }
    return { action: 'unresolved', reason: next ? `No class named ${next} — create it or choose the next class in class setup` : 'No next class — choose one in class setup or mark it final' };
}

/** Where a student sits now: their stream and class, from ids first, then class text. */
export function locateStudent(st: any, classes: any[], streams: any[]): { cls: any | null; stream: any | null } {
    const liveStreams = streams.filter(s => !s.deletedAt);
    const liveClasses = classes.filter(c => !c.deletedAt);
    const clsOf = (s: any) => liveClasses.find(c => sid(c._id) === sid(s.classId)) || null;
    if (st.streamId) {
        const s = liveStreams.find(x => sid(x._id) === sid(st.streamId));
        if (s && clsOf(s)) return { cls: clsOf(s), stream: s };
    }
    const text = nrm(st.studentClass || st.currentClass);
    if (text) {
        const s = liveStreams.filter(x => nrm(x.fullName || `${x.className} ${x.name}`) === text);
        if (s.length === 1 && clsOf(s[0])) return { cls: clsOf(s[0]), stream: s[0] };
    }
    let cls = st.classId ? liveClasses.find(c => sid(c._id) === sid(st.classId)) || null : null;
    if (!cls && (text || st.className)) {
        const byName = liveClasses.filter(c => nrm(c.name) === text || nrm(c.name) === nrm(st.className));
        if (byName.length === 1) cls = byName[0];
    }
    if (!cls) return { cls: null, stream: null };
    const sName = nrm(st.stream || st.streamName);
    const inCls = liveStreams.filter(x => sid(x.classId) === sid(cls._id));
    const stream = (sName && inCls.find(x => nrm(x.name) === sName))
        || inCls.find(x => text && nrm(x.fullName || `${x.className} ${x.name}`) === text) || null;
    return { cls, stream };
}

export async function buildPromotionPlan(db: any, opts: PromotionOptions = {}) {
    const createMissing = opts.createMissingStreams !== false;
    const graduateFinal = opts.graduateFinal !== false;
    const scope = new Set((opts.classIds || []).map(String).filter(Boolean));
    const exclude = new Set((opts.excludeStudentIds || []).map(String));
    const targetYear = String(opts.academicYear || defaultTargetYear());

    const [classes, streams, students] = await Promise.all([
        db.collection('v2_classes').find({ deletedAt: { $exists: false } }).toArray(),
        db.collection('v2_streams').find({ deletedAt: { $exists: false } }).toArray(),
        db.collection('students').find({}, { projection: { studentName: 1, name: 1, firstName: 1, lastName: 1, registrationNo: 1, admNo: 1, admissionNumber: 1, status: 1, classId: 1, className: 1, studentClass: 1, currentClass: 1, streamId: 1, stream: 1, streamName: 1, academicYear: 1, lastPromotion: 1 } }).toArray(),
    ]);

    const routes = new Map<string, ClassRoute>();
    for (const c of classes) routes.set(sid(c._id), resolveClassRoute(c, classes, graduateFinal));

    // destination stream for (from stream → to class); a missing one is planned for creation
    const toCreate = new Map<string, { classId: string; className: string; name: string; capacity: number }>();
    const destStream = (fromStream: any, toClass: any): { stream: any | null; create: boolean } => {
        if (!fromStream) return { stream: null, create: false };
        const hit = streams.find((s: any) => sid(s.classId) === sid(toClass._id) && nrm(s.name) === nrm(fromStream.name));
        if (hit) return { stream: hit, create: false };
        if (!createMissing) return { stream: null, create: false };
        const key = `${sid(toClass._id)}|${nrm(fromStream.name)}`;
        if (!toCreate.has(key)) toCreate.set(key, { classId: sid(toClass._id), className: toClass.name, name: String(fromStream.name).trim(), capacity: Number(fromStream.capacity) || Number(toClass.capacity) || 40 });
        return { stream: { name: String(fromStream.name).trim(), fullName: `${toClass.name} ${String(fromStream.name).trim()}`, _new: key }, create: true };
    };

    const groups = new Map<string, any>();   // per source stream (or class without stream)
    const items: any[] = [];
    const unplaced: any[] = [];
    let excluded = 0, alreadyDone = 0;

    for (const st of students) {
        if (canonicalStatus(st.status) !== 'Active') continue;
        const { cls, stream } = locateStudent(st, classes, streams);
        const who = { studentId: sid(st._id), name: st.studentName || st.name || [st.firstName, st.lastName].filter(Boolean).join(' '), adm: st.registrationNo || st.admNo || st.admissionNumber || '' };
        if (!cls) {
            if (!scope.size && (st.studentClass || st.currentClass || st.classId)) unplaced.push({ ...who, className: st.studentClass || st.currentClass || '', reason: 'Class not found in class setup' });
            continue;
        }
        if (scope.size && !scope.has(sid(cls._id))) continue;
        if (exclude.has(who.studentId)) { excluded++; continue; }
        if (st.lastPromotion?.toYear && String(st.lastPromotion.toYear) === targetYear) { alreadyDone++; continue; }

        const route = routes.get(sid(cls._id))!;
        const fromLabel = stream ? (stream.fullName || `${cls.name} ${stream.name}`) : cls.name;
        const gKey = stream ? `s:${sid(stream._id)}` : `c:${sid(cls._id)}`;
        let g = groups.get(gKey);
        if (!g) {
            g = { key: gKey, fromClassId: sid(cls._id), fromClass: cls.name, fromStreamId: stream ? sid(stream._id) : null, fromStream: stream?.name || '', fromLabel, level: Number(cls.level) || 0, action: route.action, via: (route as any).via || '', reason: (route as any).reason || '', count: 0 };
            if (route.action === 'promote') {
                const d = destStream(stream, route.toClass);
                if (stream && !d.stream) { g.action = 'unresolved'; g.reason = `${route.toClass.name} has no ${stream.name} stream`; }
                g.toClassId = sid(route.toClass._id); g.toClass = route.toClass.name;
                g.toStreamId = d.stream && !d.create ? sid(d.stream._id) : null; g.toStream = d.stream?.name || '';
                g.toLabel = d.stream ? (d.stream.fullName || `${route.toClass.name} ${d.stream.name}`) : route.toClass.name;
                g.createStream = d.create ? (d.stream as any)._new : null;
                g.toCapacity = d.stream && !d.create ? Number(d.stream.capacity) || 0 : 0;
            }
            groups.set(gKey, g);
        }
        g.count++;
        items.push({ ...who, group: gKey, action: g.action, from: { classId: sid(cls._id), streamId: stream ? sid(stream._id) : null, label: fromLabel }, to: g.action === 'promote' ? { classId: g.toClassId, streamId: g.toStreamId, label: g.toLabel } : null });
    }

    const list = [...groups.values()].sort((a, b) => a.level - b.level || a.fromLabel.localeCompare(b.fromLabel));
    // Capacity check uses the destination's current occupants that are not themselves moving out.
    const leaving = new Set(items.filter(i => i.action !== 'unresolved').map(i => i.from.streamId).filter(Boolean));
    for (const g of list) {
        if (g.action !== 'promote' || !g.toStreamId || !g.toCapacity) continue;
        const incoming = list.filter(x => x.action === 'promote' && x.toStreamId === g.toStreamId).reduce((n, x) => n + x.count, 0);
        const staying = leaving.has(g.toStreamId) ? 0 : items.filter(i => i.from.streamId === g.toStreamId).length;
        if (incoming + staying > g.toCapacity) g.warning = `${g.toLabel} will hold ${incoming + staying} (capacity ${g.toCapacity})`;
    }
    const n = (a: string) => list.filter(g => g.action === a).reduce((s, g) => s + g.count, 0);
    return {
        targetYear,
        groups: list,
        items,
        streamsToCreate: [...toCreate.entries()].map(([key, v]) => ({ key, ...v })),
        unplaced,
        summary: { promote: n('promote'), graduate: n('graduate'), unresolved: n('unresolved'), excluded, alreadyDone, unplaced: unplaced.length, newStreams: toCreate.size },
    };
}

const CLASS_FIELDS = ['classId', 'className', 'studentClass', 'currentClass', 'streamId', 'stream', 'streamName', 'academicYear'];

/**
 * Apply a promotion. `runId` identifies the run (the schedule id): students already done
 * in this run are skipped, so running again after an interruption only finishes the rest.
 */
export async function executePromotion(db: any, runId: string, opts: PromotionOptions, by = 'auto-promotion', heartbeat?: () => Promise<any>) {
    const plan = await buildPromotionPlan(db, opts);
    const at = new Date();

    // 1. Streams that the next class is missing (re-checked so a rerun never duplicates them)
    const created: Record<string, any> = {};
    for (const s of plan.streamsToCreate) {
        const existing = await db.collection('v2_streams').findOne({ classId: s.classId, deletedAt: { $exists: false }, name: { $regex: `^\\s*${s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, $options: 'i' } });
        if (existing) { created[s.key] = existing; continue; }
        const doc = { classId: s.classId, className: s.className, name: s.name, fullName: `${s.className} ${s.name}`, capacity: s.capacity, classTeacherId: null, isActive: true, createdAt: at, createdBy: by, autoCreatedByRun: runId };
        const r = await db.collection('v2_streams').insertOne(doc);
        created[s.key] = { _id: r.insertedId, ...doc };
    }
    const groups = new Map(plan.groups.map((g: any) => [g.key, g]));

    let promoted = 0, graduated = 0, skipped = 0, changed = 0;
    const errors: any[] = [];
    let n = 0;
    for (const it of plan.items) {
        if (heartbeat && ++n % 200 === 0) await heartbeat().catch(() => {});
        if (it.action === 'unresolved') { skipped++; continue; }
        const g: any = groups.get(it.group);
        const oid = toOid(it.studentId);
        if (!oid) { skipped++; continue; }
        try {
            if (await db.collection('promotion_run_items').findOne({ runId, studentId: it.studentId })) continue;
            const st = await db.collection('students').findOne({ _id: oid });
            // Moved, left or changed since the plan was made → leave them alone.
            if (!st || canonicalStatus(st.status) !== 'Active') { changed++; continue; }
            const before: any = {}; for (const f of [...CLASS_FIELDS, 'status', 'lastPromotion']) before[f] = st[f] === undefined ? null : st[f];
            const history = { className: st.studentClass || st.currentClass || '', classId: st.classId || '', streamId: st.streamId || '', streamName: st.stream || st.streamName || '', academicYear: st.academicYear || '', leftAt: at, reason: it.action === 'graduate' ? 'Graduated' : 'Promoted', runId };
            const lastPromotion = { runId, at, toYear: plan.targetYear, from: it.from.label };

            if (it.action === 'graduate') {
                const { update } = buildStatusUpdate(st, 'Graduated', { reason: 'Completed the final class', by, extraSet: { graduatedAt: at, graduationYear: plan.targetYear, lastPromotion } });
                if (!update) { skipped++; continue; }
                await db.collection('students').updateOne({ _id: oid }, update);
                graduated++;
            } else {
                let toStreamId = g.toStreamId, toStreamName = g.toStream, label = g.toLabel;
                if (g.createStream) { const s = created[g.createStream]; toStreamId = s ? sid(s._id) : null; toStreamName = s?.name || ''; label = s ? s.fullName : g.toClass; }
                await db.collection('students').updateOne({ _id: oid }, {
                    $set: { studentClass: label, currentClass: label, classId: g.toClassId, className: g.toClass, streamId: toStreamId || null, stream: toStreamName || '', streamName: toStreamName || '', academicYear: plan.targetYear, updatedAt: at, lastPromotion },
                    $push: { classHistory: history } as any,
                });
                it.to = { classId: g.toClassId, streamId: toStreamId, label };
                promoted++;
            }
            await db.collection('promotion_run_items').insertOne({ runId, studentId: it.studentId, name: it.name, adm: it.adm, action: it.action, from: it.from, to: it.to, before, at });
        } catch (e: any) { errors.push({ studentId: it.studentId, name: it.name, message: e.message }); }
    }
    return {
        targetYear: plan.targetYear, promoted, graduated, skipped, changed, errors: errors.slice(0, 50), failed: errors.length,
        streamsCreated: Object.values(created).filter((s: any) => s.autoCreatedByRun === runId).map((s: any) => s.fullName),
        unresolved: plan.groups.filter((g: any) => g.action === 'unresolved').map((g: any) => ({ fromLabel: g.fromLabel, count: g.count, reason: g.reason })),
        excluded: plan.summary.excluded, alreadyDone: plan.summary.alreadyDone, unplaced: plan.summary.unplaced,
        finishedAt: new Date(),
    };
}

/** Put every student of a run back where they were — unless they have moved again since. */
export async function revertPromotion(db: any, runId: string, by = 'admin') {
    const items = await db.collection('promotion_run_items').find({ runId, revertedAt: { $exists: false } }).toArray();
    let reverted = 0, kept = 0;
    for (const it of items) {
        const oid = toOid(it.studentId);
        const st = oid ? await db.collection('students').findOne({ _id: oid }) : null;
        if (!st || sid(st.lastPromotion?.runId) !== runId) { kept++; continue; }
        const set: any = { updatedAt: new Date() }; const unset: any = {};
        for (const [k, v] of Object.entries(it.before || {})) { if (v === null) unset[k] = ''; else set[k] = v; }
        if (it.action === 'graduate') { unset.statusPrevClass = ''; unset.graduatedAt = ''; unset.graduationYear = ''; set.status = it.before?.status || 'Active'; delete unset.status; }
        const update: any = { $set: set, $push: { promotionReverts: { runId, at: new Date(), by } } };
        if (Object.keys(unset).length) update.$unset = unset;
        await db.collection('students').updateOne({ _id: oid }, update);
        // the class-history line this run added is no longer true
        await db.collection('students').updateOne({ _id: oid }, { $pull: { classHistory: { runId } } as any });
        await db.collection('promotion_run_items').updateOne({ _id: it._id }, { $set: { revertedAt: new Date(), revertedBy: by } });
        reverted++;
    }
    return { reverted, kept };
}

/** Claims and runs every due schedule of one school. Safe to call from several servers at once. */
export async function runDuePromotions(db: any) {
    const now = new Date();
    // A run interrupted by a restart is resumed (its finished students are skipped).
    await db.collection('promotion_schedules').updateMany(
        { status: 'running', heartbeatAt: { $lt: new Date(now.getTime() - 15 * 60_000) } },
        { $set: { status: 'scheduled', runAt: now, note: 'Resumed after an interruption' } },
    );
    for (let i = 0; i < 5; i++) {
        const sch: any = await db.collection('promotion_schedules').findOneAndUpdate(
            { status: 'scheduled', runAt: { $lte: now } },
            { $set: { status: 'running', startedAt: now, heartbeatAt: now } },
            { returnDocument: 'after' },
        );
        if (!sch) return;
        await runSchedule(db, sch, 'auto-promotion');
    }
}

export async function runSchedule(db: any, sch: any, by: string) {
    const id = sid(sch._id);
    try {
        const result = await executePromotion(db, id, sch.options || {}, by, () => db.collection('promotion_schedules').updateOne({ _id: sch._id }, { $set: { heartbeatAt: new Date() } }));
        await db.collection('promotion_schedules').updateOne({ _id: sch._id }, { $set: { status: 'completed', result, completedAt: new Date(), ranBy: by } });
        return result;
    } catch (e: any) {
        await db.collection('promotion_schedules').updateOne({ _id: sch._id }, { $set: { status: 'failed', error: e.message, failedAt: new Date() } });
        throw e;
    }
}

/**
 * Auto-promotes every active student onto the next class, the moment the academic YEAR
 * itself advances (not a term-to-term move within the same year — see cbcTerm.ts's
 * syncCurrentTerm, the only caller). Grade 1 → Grade 2 → … → Grade 9, then Grade 10-12 if
 * the school offers senior school (else graduates at 9); Form 1 → 2 → 3 → 4 → graduates —
 * all via the same class ladder (resolveClassRoute) the manual/scheduled promotion UI uses.
 *
 * Idempotent: `runId` is deterministic per year, so if this fires more than once (another
 * tenant request, a retry) the per-student `lastPromotion.toYear` / `promotion_run_items`
 * guards already in buildPromotionPlan/executePromotion make every call after the first a
 * cheap no-op — never double-promotes.
 */
export async function runAutoPromotionForYearTransition(db: any, newYear: number | string) {
    const runId = `auto-year-${newYear}`;
    try {
        return await executePromotion(db, runId, { academicYear: String(newYear), graduateFinal: true }, 'auto-year-transition');
    } catch (e: any) {
        // Never let a promotion failure break the term/year sync that triggered it.
        return { error: e.message };
    }
}

/** Scheduler tick (server.ts): runs due promotions in every school. */
let ticking = false;
export async function runDuePromotionsAllTenants() {
    if (ticking) return;
    ticking = true;
    try {
        const { getMetaDb, getTenantDb, subdomainToDbName } = await import('../lib/mongodb');
        const tenants = await getMetaDb().collection('Tenant').find({}, { projection: { subdomain: 1, databaseName: 1 } }).toArray().catch(() => []);
        const now = new Date();
        for (const t of tenants) {
            try {
                const dbName = t.databaseName || subdomainToDbName(String(t.subdomain || '').toLowerCase());
                if (!dbName) continue;
                const db = getTenantDb(dbName);
                const due = await db.collection('promotion_schedules').countDocuments({ $or: [{ status: 'scheduled', runAt: { $lte: now } }, { status: 'running' }] }, { limit: 1 });
                if (due) await runDuePromotions(db);
            } catch { /* next school */ }
        }
    } finally { ticking = false; }
}
