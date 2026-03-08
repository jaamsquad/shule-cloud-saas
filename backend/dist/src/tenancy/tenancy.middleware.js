"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenancyMiddleware = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TenancyMiddleware = class TenancyMiddleware {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async use(req, res, next) {
        const path = req.originalUrl || req.url;
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
        if (!tenant)
            throw new common_1.NotFoundException('School not found');
        if (tenant.status !== 'active')
            throw new common_1.UnauthorizedException('School account is inactive');
        req.tenantContext = {
            tenantId: tenant.id,
            tenantSubdomain: subdomain,
            subscription: tenant.subscription,
        };
        next();
    }
};
exports.TenancyMiddleware = TenancyMiddleware;
exports.TenancyMiddleware = TenancyMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenancyMiddleware);
//# sourceMappingURL=tenancy.middleware.js.map