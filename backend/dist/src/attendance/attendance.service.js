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
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AttendanceService = class AttendanceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async markStudentAttendance(tenantId, data, markedByUserId) {
        const { date, classId, studentId, status } = data;
        return this.prisma.studentAttendance.create({
            data: {
                tenantId,
                date: new Date(date),
                classId,
                studentId,
                status,
                markedByUserId
            }
        });
    }
    async getStudentReport(tenantId, query) {
        const { classId, startDate, endDate } = query;
        return this.prisma.studentAttendance.findMany({
            where: {
                tenantId,
                classId: classId || undefined,
                date: {
                    gte: startDate ? new Date(startDate) : undefined,
                    lte: endDate ? new Date(endDate) : undefined,
                }
            },
            include: { student: true }
        });
    }
    async markStaffAttendance(tenantId, data, markedByUserId) {
        const { date, staffUserId, status } = data;
        return this.prisma.staffAttendance.create({
            data: {
                tenantId,
                date: new Date(date),
                staffUserId,
                status,
                markedByUserId
            }
        });
    }
    async getStaffReport(tenantId, query) {
        const { startDate, endDate } = query;
        return this.prisma.staffAttendance.findMany({
            where: {
                tenantId,
                date: {
                    gte: startDate ? new Date(startDate) : undefined,
                    lte: endDate ? new Date(endDate) : undefined,
                }
            },
            include: { staffUser: { include: { user: true } } }
        });
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map