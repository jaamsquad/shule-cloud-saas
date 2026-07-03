/**
 * Curriculum engine — the central academic engine for ShuleCloud.
 *
 * Every academic request resolves a class → its curriculum → a config object that
 * declares how academic modules should behave: terminology (Subjects vs Learning
 * Areas), assessment mode (marks/grades vs competencies/rubrics), report-card
 * layout, exam types, lesson-plan template, and promotion style.
 *
 * Curriculum behavior is decided SERVER-SIDE here — never in the frontend. New
 * curricula are added by configuration (a row in the `curricula` collection with a
 * matching CONFIG entry), not by rewriting academic modules.
 *
 * Model: classes carry a `curriculumType` string (e.g. "844", "CBC", "Cambridge")
 * which is the curriculum's `code`. A `curricula` registry collection lets admins
 * enable/disable curricula and override config; when empty we fall back to the
 * built-in defaults below so the system works out of the box.
 */
import { Db, ObjectId } from 'mongodb';

export type AssessmentMode = 'traditional' | 'competency';

export interface CurriculumConfig {
    code: string;                 // canonical code stored on classes (e.g. "844", "CBC")
    name: string;                 // display name
    aliases: string[];            // other strings that map to this curriculum
    active: boolean;
    assessmentMode: AssessmentMode;
    terminology: {
        subject: string;          // "Subject" | "Learning Area"
        subjectPlural: string;    // "Subjects" | "Learning Areas"
        assessment: string;       // "Exam" | "Assessment"
        assessmentPlural: string; // "Exams" | "Assessments"
        score: string;            // "Marks" | "Performance Level"
        grade: string;            // "Grade" | "Competency Level"
    };
    reportLayout: string;         // report-card template key ("844" | "cbc" | "cambridge")
    examTypes: string[];          // exam/assessment types offered
    lessonPlanTemplate: string;   // "traditional" | "competency"
    promotion: 'grade' | 'class'; // grade-to-grade vs class promotion
    performanceLevels?: Array<{ code: string; label: string }>; // CBC-style bands
    levelPrefix: string;          // "Form" | "Grade"
}

const KCSE_LEVELS: undefined = undefined; // 8-4-4 uses numeric grades, no bands

// ── Built-in defaults (used when the registry has no override) ────────────────
export const DEFAULT_CURRICULA: Record<string, CurriculumConfig> = {
    '844': {
        code: '844', name: '8-4-4', aliases: ['844', '8-4-4', '8.4.4', 'kcse', 'kcpe', 'traditional'],
        active: true, assessmentMode: 'traditional',
        terminology: { subject: 'Subject', subjectPlural: 'Subjects', assessment: 'Exam', assessmentPlural: 'Exams', score: 'Marks', grade: 'Grade' },
        reportLayout: '844', examTypes: ['CAT', 'Mid Term', 'End Term', 'Mock'],
        lessonPlanTemplate: 'traditional', promotion: 'class',
        performanceLevels: KCSE_LEVELS, levelPrefix: 'Form',
    },
    'CBC': {
        code: 'CBC', name: 'CBC (Competency-Based)', aliases: ['cbc', 'competency', 'competency-based', 'competency based', '2-6-3-3', '2-6-6-3'],
        active: true, assessmentMode: 'competency',
        terminology: { subject: 'Learning Area', subjectPlural: 'Learning Areas', assessment: 'Assessment', assessmentPlural: 'Assessments', score: 'Performance Level', grade: 'Competency Level' },
        reportLayout: 'cbc', examTypes: ['Assessment Activity', 'Competency Task', 'Project', 'Practical'],
        lessonPlanTemplate: 'competency', promotion: 'grade',
        performanceLevels: [
            { code: 'EE', label: 'Exceeding Expectation' }, { code: 'ME', label: 'Meeting Expectation' },
            { code: 'AE', label: 'Approaching Expectation' }, { code: 'BE', label: 'Below Expectation' },
        ],
        levelPrefix: 'Grade',
    },
    // Only CBC and 8-4-4 are offered. (Cambridge removed.)
};

const norm = (v: any) => String(v ?? '').toLowerCase().replace(/[\s._-]+/g, ' ').trim();

/** Map any curriculum string (code/name/alias) to a canonical config code. */
export function canonicalCode(value: any): string {
    const v = norm(value);
    if (!v) return '844';
    for (const cfg of Object.values(DEFAULT_CURRICULA)) {
        if (norm(cfg.code) === v || norm(cfg.name) === v || cfg.aliases.some(a => norm(a) === v)) return cfg.code;
    }
    return '844'; // default: unknown → 8-4-4
}

/**
 * Load the effective curriculum registry: built-in defaults merged with any
 * per-tenant overrides in the `curricula` collection (enable/disable, config).
 */
export async function loadCurricula(db: Db): Promise<CurriculumConfig[]> {
    const overrides = await db.collection('curricula').find({}).toArray().catch(() => []);
    const byCode: Record<string, CurriculumConfig> = {};
    // Start from defaults.
    for (const cfg of Object.values(DEFAULT_CURRICULA)) byCode[cfg.code] = { ...cfg };
    // Apply overrides (a stored row may toggle active, rename, or add a new curriculum).
    for (const o of overrides) {
        const code = canonicalCode(o.code || o.name) || String(o.code || '');
        const base = byCode[code] || DEFAULT_CURRICULA['844'];
        byCode[o.code || code] = {
            ...base,
            code: o.code || base.code,
            name: o.name || base.name,
            active: o.active !== undefined ? !!o.active : base.active,
            ...(o.config && typeof o.config === 'object' ? o.config : {}),
        };
    }
    return Object.values(byCode);
}

/** Resolve the config for a curriculum code/name, honoring registry overrides. */
export async function getCurriculumConfig(db: Db, curriculumValue: any): Promise<CurriculumConfig> {
    const code = canonicalCode(curriculumValue);
    const all = await loadCurricula(db);
    return all.find(c => c.code === code) || DEFAULT_CURRICULA[code] || DEFAULT_CURRICULA['844'];
}

/**
 * Resolve a class document → its curriculum config. Reads the class's
 * `curriculumType` (v2_classes) or `curriculum`/`curriculumType` (legacy). This is
 * THE entry point academic modules call: class in → behavior config out.
 */
export async function resolveClassCurriculum(db: Db, classId: string): Promise<{ classDoc: any | null; config: CurriculumConfig }> {
    let classDoc: any = null;
    const oid = (() => { try { return new ObjectId(classId); } catch { return null; } })();
    if (oid) {
        classDoc = await db.collection('v2_classes').findOne({ _id: oid }).catch(() => null)
            || await db.collection('classes').findOne({ _id: oid }).catch(() => null);
    }
    if (!classDoc) {
        // Match by name as a fallback (legacy rows keyed differently).
        classDoc = await db.collection('v2_classes').findOne({ name: classId }).catch(() => null)
            || await db.collection('classes').findOne({ $or: [{ name: classId }, { levelName: classId }, { className: classId }] }).catch(() => null);
    }
    const curriculumValue = classDoc?.curriculumType ?? classDoc?.curriculum ?? classDoc?.curriculumCode ?? '844';
    const config = await getCurriculumConfig(db, curriculumValue);
    return { classDoc, config };
}

/**
 * Resolve a curriculum from a free-text class LABEL (e.g. "Grade 6", "Form 2"),
 * used where only the class name is known (marks stamped with classAtTime, etc.).
 * Grade/PP → CBC; Form → 8-4-4; Year → Cambridge; else default.
 */
export function curriculumFromClassLabel(label: string): string {
    const v = norm(label);
    if (/\b(grade|pp\s*\d|junior|jss|pre\s*primary)\b/.test(v)) return 'CBC';
    if (/\bform\b/.test(v)) return '844';
    if (/\byear\b/.test(v)) return 'Cambridge';
    return '844';
}
