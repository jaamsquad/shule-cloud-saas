import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getStats(tenantId: string) {
        const [totalStudents, totalStaff, totalClasses, recentPayments] = await Promise.all([
            this.prisma.student.count({ where: { tenantId, status: 'active' } }),
            this.prisma.staffProfile.count({ where: { tenantId } }),
            this.prisma.schoolClass.count({ where: { tenantId } }),
            this.prisma.payment.findMany({
                where: { tenantId },
                orderBy: { receivedAt: 'desc' },
                take: 5,
                include: { invoice: { include: { student: true } } },
            }),
        ]);

        const totalCollection = await this.prisma.payment.aggregate({
            where: { tenantId },
            _sum: { amount: true }
        });

        // Mocking some stats for the premium UI until full modules are implemented
        return {
            totalStudents,
            totalStaff,
            totalClasses,
            attendanceToday: 98, // Mock 98%
            feeCollection: 65,   // Mock 65%
            totalCollection: totalCollection._sum.amount || 0,
            recentPayments,
            currency: 'KES',
        };
    }
}
