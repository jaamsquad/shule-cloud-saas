/**
 * Curriculum API.
 *
 *   GET  /curricula                       → registry (defaults ⊕ overrides), for settings
 *   PATCH /curricula/:code                → enable/disable or override a curriculum (admin)
 *   GET  /curriculum/config?curriculum=   → config for a curriculum code/name
 *   GET  /class/:id/curriculum            → resolve a class → its curriculum config
 *
 * The `/class/:id/curriculum` endpoint is the contract the spec requires: any
 * academic module (or the frontend) asks the backend "what curriculum governs this
 * class?" and gets the full behavior config — terminology, assessment mode, report
 * layout, exam types, lesson-plan template, promotion style. No frontend logic
 * decides curriculum behavior.
 */
import { Router, Request, Response } from 'express';
import { Db } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { loadCurricula, getCurriculumConfig, resolveClassCurriculum, canonicalCode } from '../lib/curriculum';

const router = Router();
const db = (req: Request): Db => (req as any).tenantDb || getMetaDb();

const ADMIN_ROLES = new Set(['super_admin', 'school_admin', 'admin', 'principal', 'super admin', 'school admin']);
const isAdmin = (req: Request) => { const r = String((req as any).tenantContext?.user?.role || '').toLowerCase(); return !r || ADMIN_ROLES.has(r); };

// Registry — all curricula with their active flag (for the settings screen).
router.get('/curricula', async (req: Request, res: Response) => {
    try {
        const all = await loadCurricula(db(req));
        res.json(all);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Only the ACTIVE curricula (for pickers in the class form).
router.get('/curricula/active', async (req: Request, res: Response) => {
    try {
        const all = await loadCurricula(db(req));
        res.json(all.filter(c => c.active));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Enable/disable or override a curriculum (admin only). Upserts into `curricula`.
router.patch('/curricula/:code', async (req: Request, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only an administrator can change curricula.' });
        const d = db(req);
        const code = req.params.code;
        const { active, name, config } = req.body || {};
        if (active === false) {   // at least one curriculum has to stay on
            const others = (await loadCurricula(d)).filter(c => c.active && canonicalCode(c.code) !== canonicalCode(code));
            if (!others.length) return res.status(400).json({ message: 'At least one curriculum must stay enabled.' });
        }
        const set: any = { code, updatedAt: new Date() };
        if (active !== undefined) set.active = !!active;
        if (name !== undefined) set.name = name;
        if (config !== undefined) set.config = config;
        await d.collection('curricula').updateOne({ code }, { $set: set, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
        res.json({ message: 'Updated', code });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Config for a curriculum code/name (e.g. ?curriculum=CBC).
router.get('/curriculum/config', async (req: Request, res: Response) => {
    try {
        const cfg = await getCurriculumConfig(db(req), req.query.curriculum);
        res.json(cfg);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Resolve a class → its curriculum config. THE academic-request contract.
router.get('/class/:id/curriculum', async (req: Request, res: Response) => {
    try {
        const { classDoc, config } = await resolveClassCurriculum(db(req), req.params.id);
        res.json({
            classId: req.params.id,
            className: classDoc?.name || classDoc?.levelName || classDoc?.className || null,
            curriculumCode: config.code,
            config,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Promotion path for a class — respects the class's curriculum. CBC promotes
// grade-to-grade (Grade 6 → Grade 7, PP1 → PP2 → Grade 1); 8-4-4 promotes Form 1
// → Form 2 → … → Form 4 (graduate). Returns the suggested next class label + the
// promotion style, and matches it to an existing v2 class where possible.
router.get('/class/:id/promotion', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const { classDoc, config } = await resolveClassCurriculum(d, req.params.id);
        const label = String(classDoc?.name || classDoc?.levelName || classDoc?.className || req.params.id);
        const nextLabel = nextClassLabel(label, config.promotion, config.code);
        // Try to resolve the suggested next class to a real v2 class.
        let nextClass = null;
        if (nextLabel) {
            const all = await d.collection('v2_classes').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
            const nrm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
            nextClass = all.find((c: any) => nrm(c.name) === nrm(nextLabel)) || null;
        }
        res.json({
            classId: req.params.id, currentClass: label,
            curriculum: config.code, promotion: config.promotion,
            graduates: nextLabel === null,
            nextClassLabel: nextLabel,
            nextClassId: nextClass ? String(nextClass._id) : null,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Compute the next class label from a class label + promotion style. Bumps the
// trailing number (Form 1 → Form 2, Grade 6 → Grade 7). Returns null at the top
// (Form 4 graduates; Grade 9 → completes junior school).
function nextClassLabel(label: string, _promotion: string, code: string): string | null {
    const m = String(label).match(/^(.*?)(\d+)\s*$/);
    if (!m) {
        // Non-numeric CBC steps (PP1 → PP2 → Grade 1).
        const v = label.toLowerCase().trim();
        if (v === 'pp1') return 'PP2';
        if (v === 'pp2') return 'Grade 1';
        return null;
    }
    const prefix = m[1].trim(); const n = Number(m[2]);
    // Terminal levels: 8-4-4 Form 4 graduates; CBC caps around Grade 9 (junior) / 12.
    const cap = /form/i.test(prefix) ? 4 : /grade/i.test(prefix) ? 12 : 99;
    if (n >= cap) return null;
    return `${prefix} ${n + 1}`.trim();
}

export { canonicalCode };
export default router;
