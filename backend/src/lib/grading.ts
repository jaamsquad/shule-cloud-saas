/**
 * Grading resolution — the single source of truth for a class's grading scale.
 *
 * Resolution order for a class:
 *   1. The GRADING TEMPLATE assigned to the class (v2_classes.gradingTemplateId).
 *   2. A class-specific grading_criteria row.
 *   3. The global grading_criteria row (rows without grades are skipped).
 *   4. Curriculum Settings → grading scale (curriculum_settings.gradingScale).
 *   5. The built-in KCSE 12-point default.
 *
 * Grades are matched by lower bound (highest "from" the score reaches), so a score
 * between bands (e.g. 79.5 with bands 75-79 / 80-100) gets the band below, never E.
 *
 * The class is matched by its _id OR by NAME/level (a student may be keyed by class
 * text, not the v2 id). Report cards AND analytics both call this so grades are
 * consistent everywhere and honour the assigned template.
 */
import { Db, ObjectId } from 'mongodb';

const N = (v: any) => Number(v) || 0;
const norm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const level = (s: string) => { const m = String(s || '').match(/(form|grade)\s*\d+/i); return m ? m[0] : String(s || ''); };

export interface GradeBand { grade: string; from: number; upto: number; points: number; remark: string; }

const DEFAULT_SCALE: GradeBand[] = [
    { grade: 'A', from: 80, upto: 100, points: 12, remark: 'EXCELLENT' }, { grade: 'A-', from: 75, upto: 79, points: 11, remark: 'V.GOOD' },
    { grade: 'B+', from: 70, upto: 74, points: 10, remark: 'GOOD' }, { grade: 'B', from: 65, upto: 69, points: 9, remark: 'GOOD' },
    { grade: 'B-', from: 60, upto: 64, points: 8, remark: 'GOOD' }, { grade: 'C+', from: 55, upto: 59, points: 7, remark: 'FAIR' },
    { grade: 'C', from: 50, upto: 54, points: 6, remark: 'FAIR' }, { grade: 'C-', from: 45, upto: 49, points: 5, remark: 'AVERAGE' },
    { grade: 'D+', from: 40, upto: 44, points: 4, remark: 'BELOW AVG' }, { grade: 'D', from: 35, upto: 39, points: 3, remark: 'WEAK' },
    { grade: 'D-', from: 30, upto: 34, points: 2, remark: 'WEAK' }, { grade: 'E', from: 0, upto: 29, points: 1, remark: 'POOR' },
];

function toBands(rec: any): GradeBand[] {
    const raw = rec?.grades?.length ? rec.grades : rec?.gradingScale?.length ? rec.gradingScale : [];
    if (!raw.length) return DEFAULT_SCALE;
    return raw.map((g: any, i: number) => ({
        grade: g.grade ?? g.name ?? g.label ?? '',
        from: N(g.from ?? g.minPercent ?? g.min ?? g.min_percent),
        upto: N(g.upto ?? g.maxPercent ?? g.max ?? g.max_percent ?? 100),
        points: N(g.points ?? g.point ?? (raw.length - i)),
        remark: g.remark ?? g.status ?? g.label ?? '',
    })).sort((a: GradeBand, b: GradeBand) => b.from - a.from || b.upto - a.upto);
}

/** The band a percentage falls in: the highest band whose lower bound it reaches. */
export function gradeFromScale(scale: GradeBand[], pct: number): GradeBand {
    const p = Number(pct) || 0;
    return scale.find(s => p >= s.from) || scale[scale.length - 1];
}
/** Mean grade from mean points (nearest band at or below, with the usual .5 rounding). */
export function meanGradeFromScale(scale: GradeBand[], meanPoints: number): string {
    const byPts = [...scale].sort((a, b) => b.points - a.points);
    for (const s of byPts) if (meanPoints >= s.points - 0.5) return s.grade;
    return byPts[byPts.length - 1]?.grade || '-';
}
export { DEFAULT_SCALE };

export interface Grading {
    scale: GradeBand[];
    gradeOf: (pct: number) => GradeBand;
    meanGrade: (meanPoints: number) => string;
    source: 'template' | 'class' | 'global' | 'curriculum' | 'default';
    templateName?: string;
}

/**
 * Resolve the grading scale for a class (by id and/or name). Both report cards and
 * analytics use this, so the assigned template drives grades everywhere.
 */
export async function resolveGrading(database: Db, classId?: string, className?: string): Promise<Grading> {
    let rec: any = null;
    let source: Grading['source'] = 'default';
    let templateName: string | undefined;

    // Find the v2 class by _id, else by name/level.
    let cls: any = null;
    if (classId) {
        const oid = (() => { try { return new ObjectId(classId); } catch { return null; } })();
        if (oid) cls = await database.collection('v2_classes').findOne({ _id: oid }).catch(() => null);
    }
    if (!cls && className) {
        const v2 = await database.collection('v2_classes').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
        const want = norm(className); const wantLevel = norm(level(className));
        cls = v2.find((c: any) => norm(c.name) === want || norm(c.name) === wantLevel || norm(level(c.name)) === wantLevel) || null;
    }

    // 1) Template assigned to the class.
    if (cls?.gradingTemplateId) {
        const tOid = (() => { try { return new ObjectId(String(cls.gradingTemplateId)); } catch { return null; } })();
        if (tOid) { const t = await database.collection('grading_templates').findOne({ _id: tOid }).catch(() => null); if (t) { rec = t; source = 'template'; templateName = t.name; } }
    }
    // 2) Class-specific grading_criteria (with grades).
    const hasGrades = (r: any) => Array.isArray(r?.grades) && r.grades.length > 0;
    const rows: any[] = rec ? [] : await database.collection('grading_criteria').find({}).toArray().catch(() => []);
    const clsIds = [classId, cls?._id ? String(cls._id) : ''].filter(Boolean).map(String);
    if (!rec) { const c = rows.find(r => r.classId && clsIds.includes(String(r.classId)) && hasGrades(r)); if (c) { rec = c; source = 'class'; } }
    // 3) Global grading_criteria (the first row with grades and no class).
    if (!rec) { const g = rows.find(r => !r.classId && hasGrades(r)); if (g) { rec = g; source = 'global'; } }
    // 4) Curriculum Settings scale.
    if (!rec) { const cs: any = await database.collection('curriculum_settings').findOne({}).catch(() => null); if (cs?.gradingScale?.length) { rec = cs; source = 'curriculum'; } }

    const scale = toBands(rec);
    const gradeOf = (pct: number) => gradeFromScale(scale, pct);
    const meanGrade = (mp: number) => meanGradeFromScale(scale, mp);
    return { scale, gradeOf, meanGrade, source, templateName };
}

/** Cache resolved gradings within one request/aggregation to avoid re-querying per student. */
export function makeGradingCache(database: Db) {
    const cache = new Map<string, Promise<Grading>>();
    return (classId?: string, className?: string): Promise<Grading> => {
        const key = `${classId || ''}|${norm(className)}`;
        if (!cache.has(key)) cache.set(key, resolveGrading(database, classId, className));
        return cache.get(key)!;
    };
}
