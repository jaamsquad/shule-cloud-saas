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
exports.LimitsGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let LimitsGuard = class LimitsGuard {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const { tenantContext, path, method } = request;
        if (!tenantContext || method !== 'POST')
            return true;
        const plan = tenantContext.subscription?.plan;
        const limits = plan?.limitsJson || {};
        if (path.includes('/students')) {
            const current = await this.prisma.student.count({ where: { tenantId: tenantContext.tenantId } });
            if (limits.maxStudents && current >= limits.maxStudents) {
                throw new common_1.ForbiddenException(`Maximum student limit of ${limits.maxStudents} reached.`);
            }
        }
        if (path.includes('/staff')) {
            const current = await this.prisma.staffProfile.count({ where: { tenantId: tenantContext.tenantId } });
            if (limits.maxStaff && current >= limits.maxStaff) {
                throw new common_1.ForbiddenException(`Maximum staff limit of ${limits.maxStaff} reached.`);
            }
        }
        return true;
    }
};
exports.LimitsGuard = LimitsGuard;
exports.LimitsGuard = LimitsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LimitsGuard);
//# sourceMappingURL=limits.guard.js.map