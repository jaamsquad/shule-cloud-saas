/**
 * Links to KICD's official CBC Materials site (kicd.ac.ke/cbc-materials) — curriculum
 * designs, approved course materials and other CBC resources. We don't host or mirror
 * KICD's copyrighted documents; this is a curated directory of links that open the
 * official site in a new tab, filtered to the grades this school actually offers.
 *
 * URL confidence: the hub links below (home, curriculum-designs, approved course
 * materials, pre-primary) and "Grade Five Designs" are confirmed against KICD's own
 * indexed pages. The other per-grade links follow that same confirmed URL pattern
 * (kicd.ac.ke/cbc-materials/curriculum-designs/grade-<word>-designs/) but aren't each
 * individually confirmed — KICD occasionally reorganises its site, so if one has moved,
 * the "CBC Materials Home" link always works as a fallback.
 */

export interface CbcMaterialLink {
    label: string;
    url: string;
    /** Grade numbers (1-12) this link covers; omitted = always shown (a hub page). */
    grades?: number[];
    /** true = Pre-Primary (PP1/PP2) link. */
    prePrimary?: boolean;
}

export const CBC_MATERIAL_HUBS: CbcMaterialLink[] = [
    { label: "CBC Materials Home", url: "https://kicd.ac.ke/cbc-materials/" },
    { label: "Curriculum Designs (all levels)", url: "https://kicd.ac.ke/cbc-materials/curriculum-designs/" },
    { label: "Approved CBC Course Materials", url: "https://kicd.ac.ke/cbc-materials/approved-cbc-course-materials/" },
];

export const CBC_MATERIAL_PRE_PRIMARY: CbcMaterialLink = {
    label: "Pre-Primary (PP1 & PP2) Materials", url: "https://kicd.ac.ke/cbc-materials/pre-primary/", prePrimary: true,
};

const GRADE_WORD: Record<number, string> = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six",
    7: "seven", 8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve",
};

/** Grades 1-9 are published as "Grade <Word> Designs"; 10-12 (Senior School) as "Grade <Word>". */
export const CBC_MATERIAL_GRADES: CbcMaterialLink[] = Object.entries(GRADE_WORD).map(([n, word]) => {
    const grade = Number(n);
    const slug = grade <= 9 ? `grade-${word}-designs` : `grade-${word}`;
    const label = grade <= 9 ? `Grade ${grade} Designs` : `Grade ${grade}`;
    return { label, url: `https://kicd.ac.ke/cbc-materials/curriculum-designs/${slug}/`, grades: [grade] };
});

/** Grade numbers offered at this school, read off its own class names (e.g. "Grade 7 East" -> 7). */
export function offeredGrades(classes: Array<{ name?: string }>): Set<number> {
    const out = new Set<number>();
    classes.forEach(c => {
        const m = String(c.name || "").match(/grade\s*(\d{1,2})/i);
        if (m) { const n = Number(m[1]); if (n >= 1 && n <= 12) out.add(n); }
    });
    return out;
}

/** Whether this school has any Pre-Primary (PP1/PP2) class. */
export function offersPrePrimary(classes: Array<{ name?: string }>): boolean {
    return classes.some(c => /\bpp\s*[12]\b|pre[- ]?primary/i.test(String(c.name || "")));
}
