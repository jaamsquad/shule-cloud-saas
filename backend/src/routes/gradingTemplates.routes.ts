/**
 * Grading Scale Templates.
 *
 * A grading scale can be saved as a NAMED TEMPLATE (e.g. "KCSE 12-Point",
 * "Cambridge A*-G", "Junior School"). Many classes can be assigned to one template
 * and all use it. Templates live in `grading_templates`; a class references one via
 * `gradingTemplateId` (stored on the v2 class). Report cards & analytics resolve a
 * class → its template → scale, falling back to the global grading_criteria.
 *
 *   GET    /grading-templates                 → list templates (+ assigned class count)
 *   POST   /grading-templates                 → create a template
 *   PATCH  /grading-templates/:id             → update a template
 *   DELETE /grading-templates/:id             → delete (unassigns classes)
 *   POST   /grading-templates/:id/assign      → assign classes { classIds: [] }
 *   GET    /grading-templates/resolve/:classId → the scale a class effectively uses
 */
import { Router, Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';

const router = Router();
const db = (req: Request): Db => (req as any).tenantDb || getMetaDb();
const oid = (id: string) => { try { return new ObjectId(String(id)); } catch { return null; } };

// List templates, each with how many classes are assigned to it.
router.get('/grading-templates', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const templates = await d.collection('grading_templates').find({ deletedAt: { $exists: false } }).sort({ createdAt: 1 }).toArray();
        const classes = await d.collection('v2_classes').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
        const counts: Record<string, number> = {};
        classes.forEach((c: any) => { if (c.gradingTemplateId) counts[String(c.gradingTemplateId)] = (counts[String(c.gradingTemplateId)] || 0) + 1; });
        res.json(templates.map((t: any) => ({
            ...t,
            assignedClasses: counts[String(t._id)] || 0,
            assignedClassNames: classes.filter((c: any) => String(c.gradingTemplateId) === String(t._id)).map((c: any) => c.name),
        })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/grading-templates', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const { name, grades, curriculum } = req.body || {};
        if (!name) return res.status(400).json({ message: 'Template name is required' });
        if (!Array.isArray(grades) || grades.length === 0) return res.status(400).json({ message: 'At least one grade band is required' });
        const doc = { name, curriculum: curriculum || '', grades, createdAt: new Date(), updatedAt: new Date() };
        const r = await d.collection('grading_templates').insertOne(doc);
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/grading-templates/:id', async (req: Request, res: Response) => {
    try {
        const id = oid(req.params.id); if (!id) return res.status(400).json({ message: 'Invalid id' });
        const { _id, ...body } = req.body || {};
        await db(req).collection('grading_templates').updateOne({ _id: id }, { $set: { ...body, updatedAt: new Date() } });
        res.json({ message: 'Updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/grading-templates/:id', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const id = oid(req.params.id); if (!id) return res.status(400).json({ message: 'Invalid id' });
        await d.collection('grading_templates').updateOne({ _id: id }, { $set: { deletedAt: new Date() } });
        // Unassign any classes using it (they fall back to the global scale).
        await d.collection('v2_classes').updateMany({ gradingTemplateId: req.params.id }, { $unset: { gradingTemplateId: '' } }).catch(() => {});
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Assign one template to a set of classes (replaces their current assignment).
router.post('/grading-templates/:id/assign', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const templateId = req.params.id;
        const classIds: string[] = Array.isArray(req.body?.classIds) ? req.body.classIds.map((x: any) => String(x)) : [];
        const objIds = classIds.map(oid).filter(Boolean) as ObjectId[];
        // Set the template on the selected classes.
        if (objIds.length) await d.collection('v2_classes').updateMany({ _id: { $in: objIds } }, { $set: { gradingTemplateId: templateId } });
        // Remove the template from classes no longer in the list.
        await d.collection('v2_classes').updateMany(
            { gradingTemplateId: templateId, _id: { $nin: objIds } },
            { $unset: { gradingTemplateId: '' } },
        ).catch(() => {});
        res.json({ message: 'Assigned', count: objIds.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Resolve the effective scale a class uses (template → global fallback).
router.get('/grading-templates/resolve/:classId', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const cls: any = oid(req.params.classId)
            ? await d.collection('v2_classes').findOne({ _id: oid(req.params.classId)! }).catch(() => null)
            : null;
        let template: any = null;
        if (cls?.gradingTemplateId) template = await d.collection('grading_templates').findOne({ _id: oid(cls.gradingTemplateId)! }).catch(() => null);
        const global = await d.collection('grading_criteria').findOne({}).catch(() => null);
        res.json({
            classId: req.params.classId,
            source: template ? 'template' : 'global',
            templateName: template?.name || null,
            grades: template?.grades || global?.grades || [],
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
