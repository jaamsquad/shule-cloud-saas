/**
 * Scheduled automatic promotion — set a date & time and every class moves up by itself
 * (Grade 1 East → Grade 2 East, top class graduates). See services/promotion.service.ts.
 * The manual POST /v2/promotions flow is unchanged.
 */
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { canEditStructure } from './academics-v2.routes';
import { buildPromotionPlan, defaultTargetYear, revertPromotion, runSchedule, PromotionOptions } from '../services/promotion.service';

const router = Router();
const getRequestDb = (req: any) => req.tenantDb || getMetaDb();
const toOid = (id: string) => { try { return new ObjectId(id); } catch { return null; } };
const userOf = (req: any) => String(req.user?.name || req.user?.email || req.user?.sub || 'admin');

router.use(['/v2/promotion-plan', '/v2/promotion-schedules'], async (req, res, next) => {
    try {
        if (await canEditStructure(req)) return next();
        res.status(403).json({ message: 'Only an administrator can manage promotions.' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

const readOptions = (src: any): PromotionOptions => {
    const list = (v: any) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x: any) => String(x).trim()).filter(Boolean);
    const bool = (v: any, d: boolean) => (v === undefined || v === '' ? d : !(v === false || v === 'false' || v === '0' || v === 0));
    return {
        academicYear: src.academicYear ? String(src.academicYear) : undefined,
        classIds: list(src.classIds),
        excludeStudentIds: list(src.excludeStudentIds),
        createMissingStreams: bool(src.createMissingStreams, true),
        graduateFinal: bool(src.graduateFinal, true),
    };
};

// Preview: exactly who goes where if a promotion ran now with these options.
router.get('/v2/promotion-plan', async (req, res) => {
    try {
        const plan = await buildPromotionPlan(getRequestDb(req), readOptions(req.query));
        res.json(plan);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/v2/promotion-schedules', async (req, res) => {
    try {
        const rows = await getRequestDb(req).collection('promotion_schedules').find({}).sort({ runAt: -1 }).limit(100).toArray();
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// names of held-back learners, only for showing them again when editing
const heldBack = (b: any) => (Array.isArray(b.heldBack) ? b.heldBack : []).slice(0, 500).map((x: any) => ({ _id: String(x._id || ''), name: String(x.name || '').slice(0, 120), reg: String(x.reg || '').slice(0, 40), cls: String(x.cls || '').slice(0, 60) })).filter((x: any) => x._id);

const validate = async (db: any, body: any, selfId?: ObjectId) => {
    const runAt = new Date(body.runAt);
    if (!body.runAt || isNaN(runAt.getTime())) return { error: 'Choose the date and time the promotion should run' };
    const options = readOptions(body);
    options.academicYear = options.academicYear || defaultTargetYear(runAt);
    if (!/^\d{4}$/.test(options.academicYear)) return { error: 'Academic year must be a year like 2027' };
    // Two pending promotions into the same year would move learners twice.
    const clash = await db.collection('promotion_schedules').findOne({ status: { $in: ['scheduled', 'running'] }, 'options.academicYear': options.academicYear, ...(selfId ? { _id: { $ne: selfId } } : {}) });
    if (clash) return { error: `"${clash.name}" is already set to promote into ${options.academicYear}. Edit or cancel it first.` };
    return { runAt, options };
};

router.post('/v2/promotion-schedules', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const v: any = await validate(db, req.body || {});
        if (v.error) return res.status(400).json({ message: v.error });
        if (v.runAt.getTime() < Date.now() - 60_000) return res.status(400).json({ message: 'That time has passed — pick a future time or use "Run now"' });
        const doc = { name: String(req.body.name || `Promotion to ${v.options.academicYear}`).trim(), runAt: v.runAt, options: v.options, heldBack: heldBack(req.body), status: 'scheduled', createdAt: new Date(), createdBy: userOf(req) };
        const r = await db.collection('promotion_schedules').insertOne(doc);
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put('/v2/promotion-schedules/:id', async (req, res) => {
    try {
        const db = getRequestDb(req); const id = toOid(req.params.id);
        if (!id) return res.status(400).json({ message: 'Invalid id' });
        const cur: any = await db.collection('promotion_schedules').findOne({ _id: id });
        if (!cur) return res.status(404).json({ message: 'Not found' });
        if (!['scheduled', 'cancelled', 'failed'].includes(cur.status)) return res.status(400).json({ message: `A ${cur.status} promotion cannot be edited` });
        const v: any = await validate(db, { ...cur.options, ...cur, ...req.body }, id);
        if (v.error) return res.status(400).json({ message: v.error });
        const set: any = { name: String(req.body.name ?? cur.name).trim(), runAt: v.runAt, options: v.options, heldBack: req.body.heldBack ? heldBack(req.body) : cur.heldBack || [], status: 'scheduled', updatedAt: new Date(), updatedBy: userOf(req) };
        await db.collection('promotion_schedules').updateOne({ _id: id, status: cur.status }, { $set: set, $unset: { error: '' } });
        res.json({ message: 'Saved' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/v2/promotion-schedules/:id/cancel', async (req, res) => {
    try {
        const db = getRequestDb(req); const id = toOid(req.params.id);
        const r = await db.collection('promotion_schedules').updateOne({ _id: id, status: 'scheduled' }, { $set: { status: 'cancelled', cancelledAt: new Date(), cancelledBy: userOf(req) } });
        if (!r.modifiedCount) return res.status(400).json({ message: 'Only a scheduled promotion can be cancelled' });
        res.json({ message: 'Cancelled' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/v2/promotion-schedules/:id', async (req, res) => {
    try {
        const db = getRequestDb(req); const id = toOid(req.params.id);
        const r = await db.collection('promotion_schedules').deleteOne({ _id: id, status: { $in: ['scheduled', 'cancelled'] } });
        if (!r.deletedCount) return res.status(400).json({ message: 'A promotion that has run is kept as a record' });
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Run a scheduled (or failed) promotion immediately. The claim is atomic, so the
// background scheduler and this button can never run it at the same time.
router.post('/v2/promotion-schedules/:id/run-now', async (req, res) => {
    try {
        const db = getRequestDb(req); const id = toOid(req.params.id);
        const now = new Date();
        const sch = await db.collection('promotion_schedules').findOneAndUpdate(
            { _id: id, status: { $in: ['scheduled', 'failed'] } },
            { $set: { status: 'running', startedAt: now, heartbeatAt: now } },
            { returnDocument: 'after' },
        );
        if (!sch) return res.status(400).json({ message: 'This promotion is not waiting to run' });
        const result = await runSchedule(db, sch, userOf(req));
        res.json({ message: 'Promotion complete', result });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/v2/promotion-schedules/:id/items', async (req, res) => {
    try {
        const rows = await getRequestDb(req).collection('promotion_run_items').find({ runId: req.params.id }, { projection: { before: 0 } }).sort({ 'from.label': 1, name: 1 }).limit(5000).toArray();
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/v2/promotion-schedules/:id/revert', async (req, res) => {
    try {
        const db = getRequestDb(req); const id = toOid(req.params.id);
        const cur: any = await db.collection('promotion_schedules').findOneAndUpdate({ _id: id, status: 'completed' }, { $set: { status: 'reverting' } }, { returnDocument: 'after' });
        if (!cur) return res.status(400).json({ message: 'Only a completed promotion can be undone' });
        try {
            const r = await revertPromotion(db, req.params.id, userOf(req));
            await db.collection('promotion_schedules').updateOne({ _id: id }, { $set: { status: 'reverted', revertedAt: new Date(), revertedBy: userOf(req), revertResult: r } });
            res.json({ message: 'Promotion undone', ...r });
        } catch (e) {
            await db.collection('promotion_schedules').updateOne({ _id: id }, { $set: { status: 'completed' } });
            throw e;
        }
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
