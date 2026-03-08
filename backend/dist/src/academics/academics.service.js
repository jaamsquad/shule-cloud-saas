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
exports.AcademicsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AcademicsService = class AcademicsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllClasses(tenantId) {
        return this.prisma.schoolClass.findMany({
            where: { tenantId },
            include: {
                _count: { select: { students: true } },
                classTeacher: { include: { user: { select: { firstName: true, lastName: true } } } }
            },
            orderBy: [{ levelName: 'asc' }, { streamName: 'asc' }],
        });
    }
    async findOneClass(tenantId, id) {
        const cls = await this.prisma.schoolClass.findFirst({
            where: { id, tenantId },
            include: { students: true, classTeacher: true }
        });
        if (!cls)
            throw new common_1.NotFoundException('Class not found');
        return cls;
    }
    async createClass(tenantId, data) {
        return this.prisma.schoolClass.create({
            data: { ...data, tenantId },
        });
    }
    async updateClass(tenantId, id, data) {
        return this.prisma.schoolClass.update({
            where: { id, tenantId },
            data,
        });
    }
    async deleteClass(tenantId, id) {
        return this.prisma.schoolClass.delete({ where: { id, tenantId } });
    }
    async findAllSubjects(tenantId) {
        return this.prisma.subject.findMany({
            where: { tenantId },
            include: { strands: true },
            orderBy: [{ levelName: 'asc' }, { name: 'asc' }],
        });
    }
    async createSubject(tenantId, data) {
        return this.prisma.subject.create({
            data: { ...data, tenantId },
        });
    }
    async deleteSubject(tenantId, id) {
        return this.prisma.subject.delete({ where: { id, tenantId } });
    }
    async findAllStrands(tenantId, subjectId) {
        return this.prisma.cbcStrand.findMany({
            where: { tenantId, subjectId: subjectId || undefined },
            include: { subStrands: true, subject: true },
            orderBy: { name: 'asc' },
        });
    }
    async createStrand(tenantId, data) {
        return this.prisma.cbcStrand.create({
            data: { ...data, tenantId },
        });
    }
    async createSubStrand(tenantId, data) {
        return this.prisma.cbcSubStrand.create({
            data: { ...data, tenantId },
        });
    }
};
exports.AcademicsService = AcademicsService;
exports.AcademicsService = AcademicsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AcademicsService);
//# sourceMappingURL=academics.service.js.map