// Convert a sidebar group label to its URL slug.
// e.g. "Academic System" → "academic-system", "Behaviour & Skills" → "behaviour-and-skills"
export const groupSlug = (label: string) =>
    label
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
