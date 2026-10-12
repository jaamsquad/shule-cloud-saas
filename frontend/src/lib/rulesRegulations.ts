/**
 * Institute Rules & Regulations (General Settings → Rules & Regulations) is the one place a
 * school keeps its rules — the `rules_regulations` collection, one document whose `content`
 * field holds the whole numbered list as a single newline-delimited string (e.g.
 * "1. Rule one\n2. Rule two"). Anywhere else that needs "the school's rules" (e.g. the Exams →
 * Printouts → School Rules printout) reads/writes this same document instead of keeping its
 * own separate copy, so editing the list in one place is reflected everywhere it's used.
 */
export const parseRulesContent = (content: string | undefined | null): string[] =>
    (content || "")
        .split("\n")
        .map(line => line.replace(/^\d+\.\s*/, "").trim())
        .filter(Boolean);

export const formatRulesContent = (rules: string[]): string =>
    rules
        .map(r => r.trim())
        .filter(Boolean)
        .map((r, i) => `${i + 1}. ${r}`)
        .join("\n");
