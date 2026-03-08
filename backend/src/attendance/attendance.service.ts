import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
    constructor(private prisma: PrismaService) { }

    async markStudentAttendance(tenantId: string, data: any, markedByUserId: string) {
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

    async getStudentReport(tenantId: string, query: any) {
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

    async markStaffAttendance(tenantId: string, data: any, markedByUserId: string) {
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

    async getStaffReport(tenantId: string, query: any) {
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
}
