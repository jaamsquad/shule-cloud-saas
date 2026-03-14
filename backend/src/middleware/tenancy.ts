import { Request, Response, NextFunction } from 'express';
import { getDb } from '../lib/mongodb';

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
    const publicPrefixes = ['/api/v1/onboard', '/api/v1/owner'];
    if (publicPrefixes.some(p => path.startsWith(p))) {
        return next();
    }

    const host = (req.headers.host || '').split(':')[0];
    const xTenant = req.headers['x-tenant-subdomain'];

    let subdomain = typeof xTenant === 'string' ? xTenant : null;
    if (!subdomain && host) {
        const parts = host.split('.');
        if (parts.length > 2) {
            subdomain = parts[0];
        }
    }

    const reserved = ['owner', 'api', 'www', 'admin', 'support', 'mail', 'localhost', '127'];
    if (!subdomain || reserved.includes(subdomain)) {
        return next();
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
