/**
 * Smart Assistant API.
 *
 * Two endpoints, both driven by the reusable query engine (assistantQueries):
 *   GET  /assistant/catalog        → categories + their buttons (for the UI)
 *   POST /assistant/query          → run one query by id (+ filters) → SmartCard
 *
 * A future NL-AI would POST to the same /query with a resolved id, so no query
 * logic is duplicated. Responses are cached briefly per (tenant, id, filters, user)
 * to cut DB load while staying near real-time.
 */
import { Router, Request, Response } from 'express';
import { listCategories, runQuery, SmartCard } from '../lib/assistantQueries';

const router = Router();

// ── Tiny in-memory TTL cache (per process) ────────────────────────────────────
const CACHE_TTL_MS = 45_000;    // ~45s — spec asked for 30–60s
const cache = new Map<string, { at: number; card: SmartCard }>();
const cacheKey = (req: Request, id: string, filters: any) => {
    const tenant = (req as any).tenantContext?.tenantId || '';
    const user = (req as any).tenantContext?.user?.staffId || 'anon';
    return `${tenant}|${user}|${id}|${JSON.stringify(filters || {})}`;
};

// Catalog of categories + buttons for the dashboard.
router.get('/assistant/catalog', (_req: Request, res: Response) => {
    res.json({ categories: listCategories() });
});

// Run a single query by id.
router.post('/assistant/query', async (req: Request, res: Response) => {
    try {
        const { id, filters } = req.body || {};
        if (!id) return res.status(400).json({ message: 'query id is required' });
        if (!(req as any).tenantDb) return res.status(400).json({ message: 'No tenant context' });

        const key = cacheKey(req, id, filters);
        const hit = cache.get(key);
        if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
            return res.json({ ...hit.card, cached: true });
        }
        const card = await runQuery(id, req, filters || {});
        cache.set(key, { at: Date.now(), card });
        // Opportunistic cleanup so the map doesn't grow unbounded.
        if (cache.size > 500) { const cutoff = Date.now() - CACHE_TTL_MS; for (const [k, v] of cache) if (v.at < cutoff) cache.delete(k); }
        res.json(card);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

export default router;
