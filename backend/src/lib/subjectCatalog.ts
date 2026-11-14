/**
 * Built-in subject catalogue (Kenyan 8-4-4 and CBC senior school), grouped the way schools
 * think about them. A school ticks the subjects it offers (Subjects → Subjects we offer) and
 * each class ticks the subjects it does (Classes → New Class / Classes With Subjects).
 *
 * `code` is the KNEC subject code where one exists; `short` is the merit-list column header.
 * The frontend has a copy at frontend/src/lib/subjectCatalog.ts — keep the two in sync.
 */
export interface CatalogSubject { key: string; name: string; short: string; code?: string; group: string }

const G = (group: string, rows: [string, string, string?][]): CatalogSubject[] =>
    rows.map(([name, short, code]) => ({ key: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name, short, code, group }));

export const SUBJECT_GROUPS = ['Mathematics', 'Languages', 'Sciences', 'Humanities', 'Technicals', 'Optionals', 'Support Subjects'] as const;

export const SUBJECT_CATALOG: CatalogSubject[] = [
    ...G('Mathematics', [['Mathematics', 'MAT', '121'], ['Essential Mathematics', 'EMA'], ['Core Mathematics', 'CMA']]),
    ...G('Languages', [['English', 'ENG', '101'], ['Kiswahili', 'KIS', '102'], ['Kenyan Sign Language', 'KSL', '504'], ['Literature', 'LIT'], ['Literature In English', 'LEN'], ['Fasihi Ya Kiswahili', 'FAS'], ['Indigenous Languages', 'IND']]),
    ...G('Sciences', [['Biology', 'BIO', '231'], ['Physics', 'PHY', '232'], ['Chemistry', 'CHE', '233']]),
    ...G('Humanities', [['History and Government', 'HIS', '311'], ['Geography', 'GEO', '312'], ['C.R.E.', 'CRE', '313'], ['I.R.E.', 'IRE', '314'], ['H.R.E.', 'HRE', '315'], ['History and Citizenship', 'HCZ'], ['Community Service Learning', 'CSL']]),
    ...G('Technicals', [
        ['Home Science', 'HSC', '441'], ['Art and Design', 'ART', '442'], ['Agriculture', 'AGR', '443'], ['Woodwork', 'WDW', '444'], ['Metalwork', 'MTW', '445'],
        ['Building Construction', 'BLD', '446'], ['Power Mechanics', 'PMC', '447'], ['Electricity', 'ELC', '448'], ['Drawing and Design', 'DRD', '449'], ['Aviation', 'AVT', '450'],
        ['Computer Studies', 'CST', '451'], ['Music', 'MUS', '511'], ['Braille', 'BRL'], ['Business Studies', 'BST', '565'], ['Economics', 'ECO'], ['Technical Sign Language', 'TSL'],
        ['Music & Dance', 'MSD'], ['Fine Arts', 'FAR'], ['Theatre & Film', 'THF'], ['Sports and Recreation', 'SPR'], ['Media Technology', 'MDT'], ['Marine and Fisheries', 'MRF'],
    ]),
    ...G('Optionals', [
        ['Mathematics - Option B', 'MTB', '122'], ['Fasihi', 'FSH'], ['Biology for the Blind', 'BBL', '236'], ['General Science', 'GSC', '237'], ['French', 'FRE', '501'], ['German', 'GER', '502'],
        ['Arabic', 'ARA', '503'], ['Mandarin', 'MAN'], ['Computer Literacy', 'CLT'], ['Adapted Home Science', 'AHS'], ['Adapted Agriculture', 'AAG'], ['P.E', 'PE'], ['Library', 'LIB'],
        ['Pastoral', 'PAS'], ['Life Skills', 'LSK'], ['Latin', 'LAT'], ['Sign Language', 'SGL'], ['Catechism', 'CAT'],
    ]),
    ...G('Support Subjects', [['Learner Personal/Group Study', 'LPS'], ['Pastoral/Religious Programme Instruction', 'PRI'], ['Information Communication Technology', 'ICT'], ['Physical Education', 'PED']]),
];

export const catalogByKey = new Map(SUBJECT_CATALOG.map(s => [s.key, s]));
const norm = (v: any) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const byName = new Map(SUBJECT_CATALOG.map(s => [norm(s.name), s]));
/** The catalogue entry for a subject name a school already uses (e.g. "C.R.E" → C.R.E.). */
export const catalogMatch = (name: any) => byName.get(norm(name)) || null;
