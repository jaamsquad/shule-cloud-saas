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
import { getAiConfig, callerOf, isSchoolAdmin, schoolAiEnabled, setSchoolAi, chat, suggestionsFor, usedToday } from '../lib/aiAssistant';
import { getMetaDb } from '../lib/mongodb';

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

// ── AI assistant (Groq) ───────────────────────────────────────────────────────
// Whether the AI is available here, and whether this person may switch it for the school.
router.get('/assistant/ai/status', async (req: Request, res: Response) => {
    try {
        const c = callerOf(req);
        if (!c) return res.status(401).json({ message: 'Sign in first' });
        const cfg = await getAiConfig();
        const tenantId = (req as any).tenantContext?.tenantId;
        const platform = cfg.enabled && !!cfg.apiKey;
        const school = await schoolAiEnabled(tenantId);
        res.json({
            platform, school, enabled: platform && school, canManage: isSchoolAdmin(c), model: cfg.model,
            dailyLimit: cfg.dailyLimit, usedToday: tenantId ? await usedToday(tenantId) : 0,
            suggestions: suggestionsFor(c),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// School admin: turn the AI on or off for this school.
router.post('/assistant/ai/school', async (req: Request, res: Response) => {
    try {
        const c = callerOf(req);
        if (!isSchoolAdmin(c)) return res.status(403).json({ message: 'Only the school administrator can change this.' });
        const tenantId = (req as any).tenantContext?.tenantId;
        if (!tenantId) return res.status(400).json({ message: 'No school context' });
        await setSchoolAi(tenantId, !!req.body?.enabled);
        res.json({ school: !!req.body?.enabled, message: req.body?.enabled ? 'AI assistant turned on for your school.' : 'AI assistant turned off for your school.' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Chat: { messages: [{ role: 'user' | 'assistant', content }] } → { reply, cards }
router.post('/assistant/ai/chat', async (req: Request, res: Response) => {
    try {
        const c = callerOf(req);
        if (!c) return res.status(401).json({ message: 'Sign in first' });
        const tenantId = (req as any).tenantContext?.tenantId;
        const t: any = tenantId ? await getMetaDb().collection('Tenant').findOne({ _id: new (await import('mongodb')).ObjectId(tenantId) }, { projection: { name: 1, instituteName: 1, subdomain: 1 } }).catch(() => null) : null;
        const out = await chat(req, c, Array.isArray(req.body?.messages) ? req.body.messages : [], t?.instituteName || t?.name || t?.subdomain || 'the school');
        res.json(out);
    } catch (e: any) { res.status(e?.status || 500).json({ message: e.message || 'The assistant could not answer.' }); }
});

export default router;
