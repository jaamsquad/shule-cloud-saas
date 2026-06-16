"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const domains_service_1 = require("../services/domains.service");
const router = (0, express_1.Router)();
// ─── Simple in-memory rate limiter ──────────────────────────────────────────────
// Production note: behind multiple instances, back this with Redis.
const buckets = new Map();
const rateLimit = (max, windowMs) => (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || b.reset < now) {
        buckets.set(key, { count: 1, reset: now + windowMs });
        return next();
    }
    if (b.count >= max)
        return res.status(429).json({ message: 'Too many requests. Please slow down.' });
    b.count++;
    next();
};
const ctxOf = (req) => {
    const tenantId = req.tenantContext?.tenantId;
    const user = req.user?.email || req.user?.sub || 'admin';
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '';
    return { tenantId, user, ip };
};
const requireTenant = (req, res) => {
    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) {
        res.status(400).json({ message: 'No school context. Open this from your school portal.' });
        return null;
    }
    return tenantId;
};
// GET status
router.get('/domains/status', async (req, res) => {
    const tenantId = requireTenant(req, res);
    if (!tenantId)
        return;
    try {
        res.json(await (0, domains_service_1.getDomainStatus)(tenantId));
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// GET DNS instructions
router.get('/domains/dns-instructions', async (req, res) => {
    const tenantId = requireTenant(req, res);
    if (!tenantId)
        return;
    try {
        res.json(await (0, domains_service_1.dnsInstructions)(tenantId));
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// GET connection history
router.get('/domains/history', async (req, res) => {
    const tenantId = requireTenant(req, res);
    if (!tenantId)
        return;
    try {
        res.json(await (0, domains_service_1.getDomainHistory)(tenantId));
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// POST add domain
router.post('/domains/add', rateLimit(10, 60000), async (req, res) => {
    const tenantId = requireTenant(req, res);
    if (!tenantId)
        return;
    const { domain } = req.body || {};
    if (!domain)
        return res.status(400).json({ message: 'A domain is required' });
    try {
        res.json(await (0, domains_service_1.addDomain)(tenantId, domain, ctxOf(req)));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
});
// POST remove domain
router.post('/domains/remove', rateLimit(10, 60000), async (req, res) => {
    const tenantId = requireTenant(req, res);
    if (!tenantId)
        return;
    try {
        res.json(await (0, domains_service_1.removeDomain)(tenantId, ctxOf(req)));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
});
// POST recheck
router.post('/domains/recheck', rateLimit(20, 60000), async (req, res) => {
    const tenantId = requireTenant(req, res);
    if (!tenantId)
        return;
    try {
        res.json(await (0, domains_service_1.recheckDomain)(tenantId, ctxOf(req)));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
});
exports.default = router;
