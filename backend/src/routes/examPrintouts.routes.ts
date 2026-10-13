/**
 * Exams → Printouts: merit list, analysis report and transcripts (published results only).
 */
import { Router, Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { examClassReport, publishedExamsFor, transcripts, RankBy } from '../lib/examReports';

const router = Router();
const db = (req: Request): Db => ((req as any).tenantDb as Db) || getMetaDb();

// classes (levels) with their streams, and the published exams of a level
router.get('/exam-printouts/options', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const [classes, streams] = await Promise.all([
            d.collection('v2_classes').find({ deletedAt: { $exists: false } }).sort({ level: 1, name: 1 }).toArray().catch(() => [] as any[]),
            d.collection('v2_streams').find({ deletedAt: { $exists: false } }).toArray().catch(() => [] as any[]),
        ]);
        const level = String(req.query.level || '').trim();
        res.json({
            levels: classes.map((c: any) => ({ _id: String(c._id), name: c.name, streams: streams.filter((s: any) => String(s.classId) === String(c._id)).map((s: any) => s.name).sort() })),
            exams: level ? await publishedExamsFor(d, level) : [],
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/exam-printouts/report', async (req: Request, res: Response) => {
    try {
        const examId = String(req.query.examId || ''); const level = String(req.query.level || '');
        if (!examId || !level) return res.status(400).json({ message: 'Pick a class and an exam' });
        const RANK_OPTIONS: RankBy[] = ['points', 'marks', 'meanMarks', 'meanPoints', 'oldKcsePoints', 'newKcsePoints'];
        // A Year Average exam carries its own ranking criteria (chosen when it was created) —
        // used as the default so the merit list/analysis just works without re-picking it,
        // unless the caller explicitly overrides it via ?rankBy=.
        let defaultRankBy: string = 'points';
        if (!req.query.rankBy) {
            const examDoc: any = await db(req).collection('exams').findOne({ _id: ObjectId.isValid(examId) ? new ObjectId(examId) : (examId as any) }).catch(() => null);
            if (examDoc?.rankingCriteria) defaultRankBy = examDoc.rankingCriteria;
        }
        const reqRankBy = String(req.query.rankBy || defaultRankBy);
        const rankBy = (RANK_OPTIONS.includes(reqRankBy as RankBy) ? reqRankBy : 'points') as RankBy;
        const r = await examClassReport(db(req), examId, level, { rankBy });
        if (!r.students.length) return res.status(404).json({ message: 'No published results for this class and exam. Publish them under Exams → Manage Exams.' });
        res.json(r);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/exam-printouts/transcripts', async (req: Request, res: Response) => {
    try {
        const level = String(req.query.level || '');
        if (!level) return res.status(400).json({ message: 'Pick a class' });
        const stream = String(req.query.stream || '').trim() || null;
        const mode = String(req.query.mode || 'term') === 'all' ? 'all' : 'term';
        res.json(await transcripts(db(req), level, stream, mode));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
