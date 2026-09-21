/** Who did something, as text. Older records stored the whole user object ({ staffId, role, name }) — showing that
 *  directly in a page crashes React, so anything that names a person goes through here. */
export function who(v: any, fallback = "—"): string {
    if (v == null || v === "") return fallback;
    if (typeof v === "string" || typeof v === "number") return String(v);
    if (typeof v === "object") return String(v.name || v.staffId || v.email || v.role || fallback);
    return fallback;
}
