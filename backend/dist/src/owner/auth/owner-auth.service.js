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
exports.OwnerAuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const config_1 = require("@nestjs/config");
let OwnerAuthService = class OwnerAuthService {
    prisma;
    jwtService;
    config;
    constructor(prisma, jwtService, config) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.config = config;
    }
    async register(dto) {
        const existing = await this.prisma.ownerUser.findUnique({
            where: { email: dto.email }
        });
        if (existing)
            throw new common_1.ConflictException('Email already registered');
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.ownerUser.create({
            data: {
                name: dto.name,
                email: dto.email,
                passwordHash: hashedPassword,
                status: 'active',
            }
        });
        const tokens = await this.getTokens(user.id, user.email);
        return tokens;
    }
    async login(dto) {
        const user = await this.prisma.ownerUser.findUnique({
            where: { email: dto.email }
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (!user.isActive)
            throw new common_1.ForbiddenException('User is inactive');
        const pwMatches = await bcrypt.compare(dto.password, user.passwordHash);
        if (!pwMatches)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const tokens = await this.getTokens(user.id, user.email);
        await this.prisma.ownerUser.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });
        return tokens;
    }
    async logout(userId) {
        return true;
    }
    async getMe(userId) {
        return this.prisma.ownerUser.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                lastLogin: true,
            }
        });
    }
    async changePassword(userId, dto) {
        const user = await this.prisma.ownerUser.findUnique({
            where: { id: userId }
        });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const matches = await bcrypt.compare(dto.oldPassword, user.passwordHash);
        if (!matches)
            throw new common_1.UnauthorizedException('Invalid old password');
        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
        await this.prisma.ownerUser.update({
            where: { id: userId },
            data: { passwordHash: hashedPassword }
        });
        return true;
    }
    async getTokens(userId, email) {
        const [at, rt] = await Promise.all([
            this.jwtService.signAsync({ sub: userId, email, type: 'owner' }, {
                secret: this.config.get('OWNER_JWT_SECRET'),
                expiresIn: '1h'
            }),
            this.jwtService.signAsync({ sub: userId, email, type: 'owner' }, {
                secret: this.config.get('OWNER_JWT_REFRESH_SECRET'),
                expiresIn: '7d'
            })
        ]);
        return { access_token: at, refresh_token: rt };
    }
};
exports.OwnerAuthService = OwnerAuthService;
exports.OwnerAuthService = OwnerAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], OwnerAuthService);
//# sourceMappingURL=owner-auth.service.js.map