/**
 * Kenya CBE (Competency Based Education) structure used by Subjects → Pathways and the CBC
 * module. Built-in so every school starts from the same, correct list; schools choose what
 * they offer and can still add their own learning areas.
 *
 * Senior school (Grades 10–12), per the Ministry of Education senior school guidelines and
 * the 2025/26 Grade 10 placement:
 *   - 3 pathways, 7 tracks; each learner takes 4 core subjects + 3 electives from an
 *     accredited combination of their track (cross-track subjects only inside a combination)
 *   - core: English, Kiswahili (or Kenyan Sign Language), Mathematics (Core Mathematics for
 *     STEM, Essential Mathematics for the other pathways), Community Service Learning
 *   - every learner also takes Physical Education and ICT skills (assessed in school)
 * Lower levels follow the rationalised KICD learning areas (2024).
 * Names follow KICD wording; sources disagree on a few, so schools can rename locally.
 */
export interface Track { key: string; name: string; subjects: string[] }        // subject names (subjectCatalog)
export interface Pathway { key: string; name: string; short: string; tracks: Track[] }

export const SENIOR_CORE = ['English', 'Kiswahili', 'Community Service Learning'];
export const SENIOR_CORE_MATH = { stem: 'Core Mathematics', other: 'Essential Mathematics' };
export const SENIOR_SUPPORT = ['Physical Education', 'Information Communication Technology'];
export const ELECTIVES_PER_LEARNER = 3;

export const PATHWAYS: Pathway[] = [
    {
        key: 'stem', name: 'STEM', short: 'ST', tracks: [
            { key: 'pure-sciences', name: 'Pure Sciences', subjects: ['Biology', 'Chemistry', 'Physics', 'General Science'] },
            { key: 'applied-sciences', name: 'Applied Sciences', subjects: ['Agriculture', 'Computer Studies', 'Home Science'] },
            { key: 'technical-studies', name: 'Technical Studies', subjects: ['Aviation', 'Building Construction', 'Electricity', 'Metalwork', 'Power Mechanics', 'Woodwork', 'Drawing and Design', 'Media Technology', 'Marine and Fisheries'] },
        ],
    },
    {
        key: 'social-sciences', name: 'Social Sciences', short: 'SS', tracks: [
            { key: 'languages-literature', name: 'Languages and Literature', subjects: ['Literature In English', 'Fasihi Ya Kiswahili', 'Indigenous Languages', 'Kenyan Sign Language', 'Arabic', 'French', 'German', 'Mandarin'] },
            { key: 'humanities-business', name: 'Humanities and Business Studies', subjects: ['History and Citizenship', 'Geography', 'Business Studies', 'C.R.E.', 'I.R.E.', 'H.R.E.'] },
        ],
    },
    {
        key: 'arts-sports', name: 'Arts and Sports Science', short: 'AS', tracks: [
            { key: 'arts', name: 'Arts', subjects: ['Fine Arts', 'Music & Dance', 'Theatre & Film'] },
            { key: 'sports-science', name: 'Sports Science', subjects: ['Sports and Recreation', 'Physical Education'] },
        ],
    },
];

export const pathwayByKey = (k: any) => PATHWAYS.find(p => p.key === String(k || '')) || null;
export const trackByKey = (k: any) => { for (const p of PATHWAYS) { const t = p.tracks.find(x => x.key === String(k || '')); if (t) return { pathway: p, track: t }; } return null; };

/** The learning areas / subjects a senior learner takes: core + maths variant + support + electives. */
export function seniorSubjectsFor(pathwayKey: string | null | undefined, electives: string[] = []) {
    const math = pathwayKey === 'stem' ? SENIOR_CORE_MATH.stem : pathwayKey ? SENIOR_CORE_MATH.other : null;
    return [...SENIOR_CORE.slice(0, 2), ...(math ? [math] : [SENIOR_CORE_MATH.stem, SENIOR_CORE_MATH.other]), SENIOR_CORE[2], ...SENIOR_SUPPORT, ...electives];
}

// ── CBC learning areas by level band (rationalised KICD, 2024) ───────────────────
export interface Band { key: string; name: string; grades: string[]; areas: string[] }
export const BANDS: Band[] = [
    { key: 'pre-primary', name: 'Pre-primary (PP1–PP2)', grades: ['PP1', 'PP2'], areas: ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities', 'Religious Education Activities'] },
    { key: 'lower-primary', name: 'Lower primary (Grades 1–3)', grades: ['Grade 1', 'Grade 2', 'Grade 3'], areas: ['Indigenous Language', 'Kiswahili', 'English', 'Mathematics', 'Religious Education', 'Environmental Activities', 'Creative Activities'] },
    { key: 'upper-primary', name: 'Upper primary (Grades 4–6)', grades: ['Grade 4', 'Grade 5', 'Grade 6'], areas: ['English', 'Kiswahili', 'Mathematics', 'Religious Education', 'Science and Technology', 'Agriculture and Nutrition', 'Social Studies', 'Creative Arts'] },
    { key: 'junior-school', name: 'Junior school (Grades 7–9)', grades: ['Grade 7', 'Grade 8', 'Grade 9'], areas: ['English', 'Kiswahili', 'Mathematics', 'Religious Education', 'Social Studies', 'Integrated Science', 'Pre-Technical Studies', 'Agriculture and Nutrition', 'Creative Arts and Sports'] },
    { key: 'senior-school', name: 'Senior school (Grades 10–12)', grades: ['Grade 10', 'Grade 11', 'Grade 12'], areas: [] /* from the school's offered subjects and each learner's pathway */ },
];
/** "Grade 10 East" → senior-school band; "PP2" → pre-primary. null for 8-4-4 forms. */
export function bandOf(className: any): Band | null {
    const s = String(className || '').toLowerCase();
    const pp = s.match(/pp\s*([12])/); if (pp) return BANDS[0];
    const g = s.match(/grade\s*(\d+)/); if (!g) return null;
    const n = Number(g[1]);
    return n <= 3 ? BANDS[1] : n <= 6 ? BANDS[2] : n <= 9 ? BANDS[3] : BANDS[4];
}
