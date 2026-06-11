import { Request, Response, NextFunction } from 'express';
import { Db } from 'mongodb';
import { getMetaDb, getTenantDb, subdomainToDbName } from '../lib/mongodb';

console.log('[Tenancy] Initializing multi-tenant isolation layer...');

export interface TenantContext {
    tenantId: string;
    tenantSubdomain: string;
    databaseName: string;   // e.g. "egertondb"
    subscription: any | null;
}

declare global {
    namespace Express {
        interface Request {
            tenantContext?: TenantContext;
            tenantDb?: Db;  // The institution's own isolated database
        }
    }
}

export const tenancyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const path = req.originalUrl || req.url;

    // Skip tenancy for public/owner/registration routes
    const publicPrefixes = ['/api/v1/onboard', '/api/v1/owner', '/api/v1/auth/smart-login', '/api/v1/public', '/api/v1/mpesa', '/api/mpesa'];
    if (publicPrefixes.some(p => path.startsWith(p))) {
        return next();
    }

    const host = (req.headers.host || '').split(':')[0];
    const xTenant = req.headers['x-tenant-subdomain'];

    let subdomain = typeof xTenant === 'string' ? xTenant.trim().toLowerCase() : null;

    // ── Custom domain fast-path ───────────────────────────────────────────────
    // portal.greenwoodschool.ac.ke → resolve the tenant by its custom domain and
    // continue as if requested via the school's subdomain.
    if (!subdomain && host && host.includes('.') && !host.endsWith('.localhost')) {
        try {
            const t = await getMetaDb().collection('Tenant').findOne({ customDomain: host.toLowerCase() });
            if (t?.subdomain) subdomain = String(t.subdomain).toLowerCase();
        } catch { /* ignore — fall through to subdomain resolution */ }
    }

    if (!subdomain && host) {
        // Portal-prefixed hosts (students.egerton.localhost, staff.egerton.localhost,
        // parent.egerton.localhost) carry the tenant in the SECOND label. Strip the
        // portal prefix so we resolve the school, not the portal type.
        const portalPrefixes = new Set(['students', 'student', 'staff', 'teacher', 'teachers', 'parent', 'parents']);
        let labels = host.split('.');
        if (portalPrefixes.has(labels[0])) labels = labels.slice(1);
        // labels[0] is the tenant when at least one more label (domain/localhost) follows.
        if (labels.length > 1) subdomain = labels[0].toLowerCase();
    }

    const reserved = new Set(['owner', 'api', 'www', 'admin', 'support', 'mail', 'localhost', '127', 'app']);

    // Development fallback — use first active tenant
    if (!subdomain || reserved.has(subdomain)) {
        if (process.env.NODE_ENV !== 'production' || host.includes('localhost')) {
            try {
                const metaDb = getMetaDb();
                const defaultTenant = await metaDb.collection('Tenant').findOne({ status: 'active' });
                if (defaultTenant) {
                    subdomain = defaultTenant.subdomain;
                    console.log(`[Tenancy] Dev fallback → using tenant: "${subdomain}"`);
                }
            } catch (e) {
                console.error('[Tenancy] Dev fallback error:', e);
            }
        }

        if (!subdomain || reserved.has(subdomain)) {
            return next(); // No tenant context — skip
        }
    }

    try {
        const metaDb = getMetaDb();
        const esc = String(subdomain).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Case/space-insensitive — the stored subdomain may be "Egerton".
        const tenant = await metaDb.collection('Tenant').findOne({ subdomain: { $regex: `^\\s*${esc}\\s*$`, $options: 'i' } })
            || await metaDb.collection('Tenant').findOne({ subdomain });

        if (!tenant) {
            return res.status(404).json({ message: `School "${subdomain}" not found. Check your institution's URL.` });
        }

        if (tenant.status !== 'active') {
            return res.status(403).json({ message: 'This school account is inactive. Contact support.' });
        }

        // Derive the institution's dedicated database name
        // Use stored databaseName or auto-generate from subdomain
        const databaseName = tenant.databaseName || subdomainToDbName(subdomain);

        // If this tenant doesn't have a databaseName yet, update the record
        if (!tenant.databaseName) {
            metaDb.collection('Tenant').updateOne(
                { _id: tenant._id },
                { $set: { databaseName } }
            ).catch(() => {});
        }

        // Attach the tenant's own database to the request
        req.tenantDb = getTenantDb(databaseName);

        // ── STRICT CROSS-TENANT TOKEN GUARD ──────────────────────────────────
        // If the request carries a JWT, verify that the token belongs to THIS school.
        // We check two fields:
        //   1. tenantSubdomain (set on new logins) — direct subdomain comparison
        //   2. tenantId (always set) — compare against this school's tenant._id
        // Either mismatch means the token was issued by a different school → 403.
        const authHeader = (req as any).headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            try {
                const jwtLib = require('jsonwebtoken');
                const decoded: any = jwtLib.verify(
                    authHeader.split(' ')[1],
                    process.env.JWT_SECRET || 'secret'
                );

                let blocked = false;
                let reason  = '';

                // Check 1: subdomain in token must match current subdomain
                if (decoded.tenantSubdomain && decoded.tenantSubdomain !== subdomain) {
                    blocked = true;
                    reason  = `Token was issued for school "${decoded.tenantSubdomain}"`;
                }

                // Check 2: tenantId in token must match this school's tenant._id
                if (!blocked && decoded.tenantId) {
                    const tokenTid = decoded.tenantId.toString();
                    const thisTid  = tenant._id.toString();
                    if (tokenTid !== thisTid) {
                        blocked = true;
                        reason  = `Token was issued for a different school (ID mismatch)`;
                    }
                }

                if (blocked) {
                    return res.status(403).json({
                        message: `Access denied. ${reason}. Please log in via your school's correct URL: ${subdomain}.`,
                        code: 'TOKEN_SUBDOMAIN_MISMATCH',
                    });
                }
            } catch (_) {
                // Malformed / expired token — let the downstream route handle it (returns 401)
            }
        }

        // Fetch subscription from meta db
        let subscription: any = null;
        try {
            subscription = await metaDb.collection('TenantSubscription').findOne({ tenantId: tenant._id });
            if (subscription) {
                subscription.plan = await metaDb.collection('Plan').findOne({ _id: subscription.planId });
            }
        } catch (_) {}

        req.tenantContext = {
            tenantId: tenant._id.toString(),
            tenantSubdomain: subdomain,
            databaseName,
            subscription,
        };

        console.log(`[Tenancy] Institution: "${subdomain}" → DB: "${databaseName}"`);
        next();
    } catch (error) {
        console.error('[Tenancy] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
