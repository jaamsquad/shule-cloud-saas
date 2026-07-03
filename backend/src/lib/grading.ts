/**
 * Grading resolution — the single source of truth for a class's grading scale.
 *
 * Resolution order for a class:
 *   1. The GRADING TEMPLATE assigned to the class (v2_classes.gradingTemplateId).
 *   2. A class-specific grading_criteria row.
 *   3. The global grading_criteria row.
 *   4. The built-in KCSE 12-point default.
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
    const raw = rec?.grades || rec?.gradingScale || [];
    if (!raw.length) return DEFAULT_SCALE;
    return raw.map((g: any, i: number) => ({
        grade: g.grade ?? g.name ?? g.label ?? '',
        from: N(g.from ?? g.minPercent ?? g.min),
        upto: N(g.upto ?? g.maxPercent ?? g.max ?? 100),
        points: N(g.points ?? g.point ?? (raw.length - i)),
        remark: g.remark ?? g.status ?? g.label ?? '',
    })).sort((a: GradeBand, b: GradeBand) => b.upto - a.upto);
}

export interface Grading {
    scale: GradeBand[];
    gradeOf: (pct: number) => GradeBand;
    meanGrade: (meanPoints: number) => string;
    source: 'template' | 'class' | 'global' | 'default';
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
    // 2) Class-specific grading_criteria.
    if (!rec && classId) { const c = await database.collection('grading_criteria').findOne({ classId }).catch(() => null); if (c) { rec = c; source = 'class'; } }
    // 3) Global grading_criteria.
    if (!rec) { const g = await database.collection('grading_criteria').findOne({}).catch(() => null); if (g) { rec = g; source = 'global'; } }

    const scale = toBands(rec);
    const gradeOf = (pct: number) => scale.find(s => pct >= s.from && pct <= s.upto) || scale[scale.length - 1];
    const meanGrade = (mp: number) => { let best = scale[scale.length - 1]; for (const s of scale) { if (mp >= s.points - 0.5) { best = s; break; } } return best?.grade || '-'; };
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
