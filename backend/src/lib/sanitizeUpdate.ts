/**
 * Strip immutable / server-managed fields from an update payload before $set.
 *
 * MongoDB rejects updating `_id`; we also drop createdAt/createdBy and any id
 * aliases so a round-tripped document (fetched → edited → PATCHed) doesn't try
 * to overwrite fields it shouldn't.
 */
const STRIP = new Set(['_id', 'id', 'createdAt', 'createdBy', '__v']);

export function sanitizeUpdate(body: any): Record<string, any> {
    const out: Record<string, any> = {};
    if (!body || typeof body !== 'object') return out;
    for (const [k, v] of Object.entries(body)) if (!STRIP.has(k)) out[k] = v;
    return out;
}
