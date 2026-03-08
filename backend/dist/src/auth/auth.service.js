"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
let AuthService = class AuthService {
    prisma;
    jwtService;
    config;
    constructor(prisma, jwtService, config) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.config = config;
    }
    async login(data) {
        const { email, password, subdomain } = data;
        const tenant = await this.prisma.tenant.findUnique({
            where: { subdomain: subdomain.toLowerCase() },
        });
        if (!tenant)
            throw new common_1.NotFoundException('School not found.');
        if (tenant.status !== 'active')
            throw new common_1.UnauthorizedException('School account is inactive.');
        const user = await this.prisma.user.findFirst({
            where: {
                tenantId: tenant.id,
                email: email,
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
                }
            }
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials.');
        const pwMatches = await bcrypt.compare(password, user.passwordHash);
        if (!pwMatches)
            throw new common_1.UnauthorizedException('Invalid credentials.');
        const permissionsSet = new Set();
        for (const userRole of user.roles) {
            for (const rolePerm of userRole.role.permissions) {
                permissionsSet.add(rolePerm.permissionKey);
            }
        }
        const permissions = Array.from(permissionsSet);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const tokens = await this.getTokens(user.id, tenant.id, user.email || '');
        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                permissions,
            },
            tenant: {
                id: tenant.id,
                name: tenant.name,
                subdomain: tenant.subdomain,
                theme: tenant.theme,
                logoUrl: tenant.logoUrl,
            }
        };
    }
    async refreshToken(userId, tenantId, email) {
        return this.getTokens(userId, tenantId, email);
    }
    async getTokens(userId, tenantId, email) {
        const payload = { sub: userId, tenantId, email, type: 'tenant' };
        const [at, rt] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.config.get('JWT_ACCESS_SECRET'),
                expiresIn: '4h',
            }),
            this.jwtService.signAsync(payload, {
                secret: this.config.get('JWT_REFRESH_SECRET'),
                expiresIn: '7d',
            }),
        ]);
        return { access_token: at, refresh_token: rt };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map