/**
 * The built-in list of Kenyan grades/levels (Classes → Classes we offer): a school ticks the
 * grades it actually runs instead of typing a free-text grade name. Grouped by school stage so
 * a junior school naturally only sees junior grades ticked, a senior school only senior grades
 * — while a school running more than one simply ticks more groups.
 * Streams (e.g. "North", "Grade 1 N") stay fully free-text — only the grade/level is catalogued.
 *
 * "Secondary (Senior School)" carries both the outgoing 8-4-4 Forms 3 & 4 (students who
 * started under the old system and are finishing it out) and the incoming CBC Senior School
 * (Grades 10-12) — Kenya's curriculum transition means a secondary school runs both at once
 * for a few years. Forms 1 & 2 are gone: CBC replaced them, so they're not in the catalog.
 */
export interface CatalogClass { key: string; name: string; curriculumType: string; level: number; group: string }

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const mk = (group: string, curriculumType: string, rows: [string, number][]): CatalogClass[] =>
    rows.map(([name, level]) => ({ key: slug(name), name, curriculumType, level, group }));

export const CLASS_GROUPS = [
    'Pre-Primary', 'Lower Primary', 'Upper Primary',
    'Junior School (Grades 7-9)', 'Secondary (Senior School)',
] as const;

export const CLASS_CATALOG: CatalogClass[] = [
    ...mk('Pre-Primary', 'CBC', [['PP1', 1], ['PP2', 2]]),
    ...mk('Lower Primary', 'CBC', [['Grade 1', 1], ['Grade 2', 2], ['Grade 3', 3]]),
    ...mk('Upper Primary', 'CBC', [['Grade 4', 4], ['Grade 5', 5], ['Grade 6', 6]]),
    ...mk('Junior School (Grades 7-9)', 'CBC', [['Grade 7', 7], ['Grade 8', 8], ['Grade 9', 9]]),
    ...mk('Secondary (Senior School)', '844', [['Form 3', 3], ['Form 4', 4]]),
    ...mk('Secondary (Senior School)', 'CBC', [['Grade 10', 10], ['Grade 11', 11], ['Grade 12', 12]]),
];

export const catalogByKey = new Map(CLASS_CATALOG.map(c => [c.key, c]));

const norm = (v: any) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const byName = new Map(CLASS_CATALOG.map(c => [norm(c.name), c]));
export const classCatalogMatch = (name: any) => byName.get(norm(name)) || null;
