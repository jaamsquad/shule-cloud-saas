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
exports.StudentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let StudentsService = class StudentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId, query) {
        const { search, classId, status } = query;
        return this.prisma.student.findMany({
            where: {
                tenantId,
                classId: classId ? classId : undefined,
                status: status ? status : undefined,
                OR: search ? [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { admNo: { contains: search, mode: 'insensitive' } },
                ] : undefined,
            },
            include: {
                class: true,
                guardian: true,
            }
        });
    }
    async findOne(tenantId, id) {
        const student = await this.prisma.student.findFirst({
            where: { id, tenantId },
            include: {
                class: true,
                guardian: true,
                attendance: true,
                examScores: { include: { examPaper: true } },
                invoices: true,
            }
        });
        if (!student)
            throw new common_1.NotFoundException('Student not found');
        return student;
    }
    async create(tenantId, data) {
        return this.prisma.student.create({
            data: {
                ...data,
                tenantId,
            }
        });
    }
    async update(tenantId, id, data) {
        return this.prisma.student.update({
            where: { id, tenantId },
            data,
        });
    }
    async delete(tenantId, id) {
        return this.prisma.student.delete({
            where: { id, tenantId },
        });
    }
    async bulkImport(tenantId, students) {
        return this.prisma.$transaction(async (tx) => {
            for (const s of students) {
                await tx.student.create({
                    data: {
                        ...s,
                        tenantId,
                    }
                });
            }
            return { message: `${students.length} students imported` };
        });
    }
};
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StudentsService);
//# sourceMappingURL=students.service.js.map