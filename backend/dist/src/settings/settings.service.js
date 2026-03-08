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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SettingsService = class SettingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSchoolSettings(tenantId) {
        return this.prisma.schoolSetting.findUnique({ where: { tenantId } });
    }
    async updateSchoolSettings(tenantId, jsonSettings) {
        return this.prisma.schoolSetting.upsert({
            where: { tenantId },
            update: { jsonSettings },
            create: { tenantId, jsonSettings },
        });
    }
    async findAllAcademicYears(tenantId) {
        return this.prisma.academicYear.findMany({
            where: { tenantId },
            include: { terms: true },
            orderBy: { startDate: 'desc' },
        });
    }
    async createAcademicYear(tenantId, data) {
        const { name, startDate, endDate, terms } = data;
        return this.prisma.academicYear.create({
            data: {
                tenantId,
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                terms: {
                    create: terms.map(t => ({
                        tenantId,
                        name: t.name,
                        startDate: new Date(t.startDate),
                        endDate: new Date(t.endDate),
                    }))
                }
            }
        });
    }
    async setTermCurrent(tenantId, termId) {
        return this.prisma.$transaction(async (tx) => {
            await tx.term.updateMany({ where: { tenantId }, data: { isCurrent: false } });
            return tx.term.update({ where: { id: termId, tenantId }, data: { isCurrent: true } });
        });
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map