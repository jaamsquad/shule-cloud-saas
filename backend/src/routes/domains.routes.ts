import { Router, Request, Response, NextFunction } from 'express';
import { addDomain, removeDomain, getDomainStatus, recheckDomain, dnsInstructions, getDomainHistory } from '../services/domains.service';
import { getMetaDb } from '../lib/mongodb';

const router = Router();

// Resolve the tenant id even if tenancy middleware didn't attach context (e.g.
// the request came in on api.<root> with only the x-tenant-subdomain header).
async function resolveTenantId(req: Request): Promise<string | null> {
    const fromCtx = (req as any).tenantContext?.tenantId;
    if (fromCtx) return String(fromCtx);
    const sub = String(req.headers['x-tenant-subdomain'] || '').trim().toLowerCase();
    if (!sub) return null;
    try {
        const esc = sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const t = await getMetaDb().collection('Tenant').findOne({ subdomain: { $regex: `^\\s*${esc}\\s*$`, $options: 'i' } });
        return t ? String(t._id) : null;
    } catch { return null; }
}

// ─── Simple in-memory rate limiter ──────────────────────────────────────────────
// Production note: behind multiple instances, back this with Redis.
const buckets = new Map<string, { count: number; reset: number }>();
const rateLimit = (max: number, windowMs: number) => (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || b.reset < now) { buckets.set(key, { count: 1, reset: now + windowMs }); return next(); }
    if (b.count >= max) return res.status(429).json({ message: 'Too many requests. Please slow down.' });
    b.count++;
    next();
};

const ctxOf = (req: Request) => {
    const tenantId = (req as any).tenantContext?.tenantId;
    const user = (req as any).user?.email || (req as any).user?.sub || 'admin';
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    return { tenantId, user, ip };
};

const requireTenant = async (req: Request, res: Response): Promise<string | null> => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
        console.warn('[domains] No tenant context.', {
            path: req.originalUrl, host: req.headers.host, xTenant: req.headers['x-tenant-subdomain'],
        });
        res.status(400).json({ message: 'No school context. Open this from your school portal.' });
        return null;
    }
    return tenantId;
};

// GET status
router.get('/domains/status', async (req, res) => {
    const tenantId = await requireTenant(req, res); if (!tenantId) return;
    try { res.json(await getDomainStatus(tenantId)); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

// GET DNS instructions
router.get('/domains/dns-instructions', async (req, res) => {
    const tenantId = await requireTenant(req, res); if (!tenantId) return;
    try { res.json(await dnsInstructions(tenantId)); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

// GET connection history
router.get('/domains/history', async (req, res) => {
    const tenantId = await requireTenant(req, res); if (!tenantId) return;
    try { res.json(await getDomainHistory(tenantId)); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

// POST add domain
router.post('/domains/add', rateLimit(10, 60_000), async (req, res) => {
    const tenantId = await requireTenant(req, res); if (!tenantId) return;
    const { domain } = req.body || {};
    if (!domain) return res.status(400).json({ message: 'A domain is required' });
    try { res.json(await addDomain(tenantId, domain, ctxOf(req))); }
    catch (e: any) { res.status(400).json({ message: e.message }); }
});

// POST remove domain
router.post('/domains/remove', rateLimit(10, 60_000), async (req, res) => {
    const tenantId = await requireTenant(req, res); if (!tenantId) return;
    try { res.json(await removeDomain(tenantId, ctxOf(req))); }
    catch (e: any) { res.status(400).json({ message: e.message }); }
});

// POST recheck
router.post('/domains/recheck', rateLimit(20, 60_000), async (req, res) => {
    const tenantId = await requireTenant(req, res); if (!tenantId) return;
    try { res.json(await recheckDomain(tenantId, ctxOf(req))); }
    catch (e: any) { res.status(400).json({ message: e.message }); }
});

export default router;
