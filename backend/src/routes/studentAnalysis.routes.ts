/**
 * Student profile → Analysis (published results only).
 *   GET /students/:id/analysis?examId=   the student's exam analysis (lib/studentAnalysis)
 *   PUT /students/:id/targets            { meanMarks?, subjects: { <subject>: pct } }
 */
import { Router, Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { resolveScope, scopeForCollection, mergeFilter } from '../lib/dataScope';
import { enforceCrud } from '../lib/permissions';
import { studentAnalysis, saveTargets } from '../lib/studentAnalysis';

const router = Router();
const db = (req: Request): Db => (req as any).tenantDb || getMetaDb();

async function visibleStudent(req: Request) {
    let _id: ObjectId; try { _id = new ObjectId(String(req.params.id)); } catch { return null; }
    const d = db(req); const scope = await resolveScope(req, d);
    return d.collection('students').findOne(mergeFilter({ _id }, scopeForCollection('students', scope)), { projection: { _id: 1 } });
}

router.get('/students/:id/analysis', async (req: Request, res: Response) => {
    try {
        const s = await visibleStudent(req); if (!s) return res.status(404).json({ message: 'Student not found' });
        res.json(await studentAnalysis(db(req), String(s._id), req.query.examId ? String(req.query.examId) : undefined));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put('/students/:id/targets', enforceCrud('students', 'update'), async (req: Request, res: Response) => {
    try {
        const s = await visibleStudent(req); if (!s) return res.status(404).json({ message: 'Student not found' });
        res.json({ ...(await saveTargets(db(req), String(s._id), req.body)), message: 'Targets saved' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
