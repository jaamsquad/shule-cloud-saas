import { Injectable, NestMiddleware, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
    constructor(private prisma: PrismaService) { }

    async use(req: Request, res: Response, next: NextFunction) {
        const path = req.originalUrl || req.url;

        // Skip for public routes
        const publicRoutes = ['/api/v1/onboard', '/api/v1/auth/login'];
        if (publicRoutes.some(r => path.startsWith(r)) || path.startsWith('/owner/')) {
            return next();
        }

        const host = (req.headers.host || '').split(':')[0];
        const xTenant = req.headers['x-tenant-subdomain'];

        let subdomain = typeof xTenant === 'string' ? xTenant : null;
        if (!subdomain && host) {
            const parts = host.split('.');
            if (parts.length > 1) {
                subdomain = parts[0];
            }
        }

        const reserved = ['owner', 'api', 'www', 'admin', 'support', 'mail', 'localhost', '127'];
        if (!subdomain || reserved.includes(subdomain)) {
            return next();
        }

        const tenant = await this.prisma.tenant.findUnique({
            where: { subdomain: subdomain.toLowerCase() },
            include: {
                subscription: {
                    include: { plan: true }
                }
            }
        });

        if (!tenant) throw new NotFoundException('School not found');
        if (tenant.status !== 'active') throw new UnauthorizedException('School account is inactive');

        req.tenantContext = {
            tenantId: tenant.id,
            tenantSubdomain: subdomain,
            subscription: tenant.subscription,
        };

        next();
    }
}
