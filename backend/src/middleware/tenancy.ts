import { Request, Response, NextFunction } from 'express';
import { getDb } from '../lib/mongodb';

console.log('[Tenancy] Initializing institutional security context...');

export interface TenantContext {
    tenantId: string;
    tenantSubdomain: string;
    subscription: any | null;
}

declare global {
    namespace Express {
        interface Request {
            tenantContext?: TenantContext;
        }
    }
}

export const tenancyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const path = req.originalUrl || req.url;

    // Skip for non-tenant routes
    console.log(`[Tenancy] Evaluating access for: ${path}`);
    const publicPrefixes = ['/api/v1/onboard', '/api/v1/owner'];
    if (publicPrefixes.some(p => path.startsWith(p))) {
        return next();
    }

    const host = (req.headers.host || '').split(':')[0];
    const xTenant = req.headers['x-tenant-subdomain'];

    let subdomain = typeof xTenant === 'string' ? xTenant : null;
    console.log(`[Tenancy] Extracted Subdomain: ${subdomain} from header`);
    if (!subdomain && host) {
        const parts = host.split('.');
        if (parts.length > 2) {
            subdomain = parts[0];
        }
    }

    const reserved = ['owner', 'api', 'www', 'admin', 'support', 'mail', 'localhost', '127'];
    if (!subdomain || reserved.includes(subdomain)) {
        // In development, if no subdomain, try to fallback to a default tenant
        if (process.env.NODE_ENV !== 'production' || host.includes('localhost')) {
            console.log('[Tenancy] No subdomain found on localhost, attempting development fallback...');
            try {
                const db = getDb();
                const defaultTenant = await db.collection('Tenant').findOne({ status: 'active' });
                if (defaultTenant) {
                    subdomain = defaultTenant.subdomain;
                    console.log(`[Tenancy] Development Fallback: Using tenant "${subdomain}"`);
                }
            } catch (e) {
                console.error('[Tenancy] Fallback failed:', e);
            }
        }
        
        if (!subdomain || reserved.includes(subdomain)) {
            return next();
        }
    }

    try {
        const db = getDb();
        const tenant = await db.collection('Tenant').findOne({ subdomain: subdomain.toLowerCase() });

        if (!tenant) {
            return res.status(404).json({ message: 'School not found' });
        }

        if (tenant.status !== 'active') {
            return res.status(403).json({ message: 'School account is inactive' });
        }

        // Fetch subscription
        const subscription = await db.collection('TenantSubscription').findOne({ tenantId: tenant._id });
        if (subscription) {
            const plan = await db.collection('Plan').findOne({ _id: subscription.planId });
            subscription.plan = plan;
        }

        req.tenantContext = {
            tenantId: tenant._id.toString(),
            tenantSubdomain: subdomain,
            subscription: subscription,
        };

        next();
    } catch (error) {
        console.error('Tenancy Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
