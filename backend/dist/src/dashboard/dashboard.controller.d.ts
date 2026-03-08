import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getStats(req: any): Promise<{
        totalStudents: number;
        totalStaff: number;
        totalClasses: number;
        attendanceToday: number;
        feeCollection: number;
        totalCollection: number | import("@prisma/client/runtime/library").Decimal;
        recentPayments: ({
            invoice: {
                student: {
                    id: string;
                    status: string;
                    tenantId: string;
                    firstName: string;
                    lastName: string;
                    admNo: string;
                    gender: string | null;
                    dob: Date | null;
                    classId: string;
                    guardianId: string | null;
                };
            } & {
                id: string;
                status: string;
                createdAt: Date;
                tenantId: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                studentId: string;
                termId: string;
                invoiceNo: string;
            };
        } & {
            id: string;
            tenantId: string;
            invoiceId: string;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string | null;
            receivedBy: string;
            receivedAt: Date;
        })[];
        currency: string;
    }>;
}
