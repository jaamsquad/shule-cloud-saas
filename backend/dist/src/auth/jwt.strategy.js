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
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'jwt') {
    config;
    prisma;
    constructor(config, prisma) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get('JWT_ACCESS_SECRET') || 'fallback_access_secret_for_safety',
        });
        this.config = config;
        this.prisma = prisma;
    }
    async validate(payload) {
        if (payload.type !== 'tenant')
            return null;
        const user = await this.prisma.user.findFirst({
            where: {
                id: payload.sub,
                tenantId: payload.tenantId,
                status: 'active',
            },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true,
                            }
                        }
                    }
                },
                tenant: {
                    include: {
                        subscription: { include: { plan: true } },
                    }
                }
            }
        });
        if (!user)
            throw new common_1.UnauthorizedException('User not found or account deactivated');
        const permissions = new Set();
        for (const r of user.roles) {
            for (const p of r.role.permissions) {
                permissions.add(p.permissionKey);
            }
        }
        return {
            userId: user.id,
            tenantId: user.tenantId,
            email: user.email,
            permissions: Array.from(permissions),
            tenantContext: {
                tenantId: user.tenantId,
                tenantSubdomain: user.tenant.subdomain,
                subscription: user.tenant.subscription,
            }
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map