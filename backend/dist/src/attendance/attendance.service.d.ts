import { PrismaService } from '../prisma/prisma.service';
export declare class AttendanceService {
    private prisma;
    constructor(prisma: PrismaService);
    markStudentAttendance(tenantId: string, data: any, markedByUserId: string): Promise<{
        id: string;
        status: string;
        tenantId: string;
        studentId: string;
        classId: string;
        date: Date;
        markedByUserId: string;
    }>;
    getStudentReport(tenantId: string, query: any): Promise<({
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
        tenantId: string;
        studentId: string;
        classId: string;
        date: Date;
        markedByUserId: string;
    })[]>;
    markStaffAttendance(tenantId: string, data: any, markedByUserId: string): Promise<{
        id: string;
        status: string;
        tenantId: string;
        date: Date;
        markedByUserId: string;
        staffUserId: string;
    }>;
    getStaffReport(tenantId: string, query: any): Promise<({
        staffUser: {
            user: {
                id: string;
                email: string | null;
                passwordHash: string;
                status: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                phone: string | null;
                firstName: string | null;
                lastName: string | null;
                lastLoginAt: Date | null;
            };
        } & {
            id: string;
            userId: string;
            tenantId: string;
            title: string | null;
            staffNo: string;
            designation: string | null;
            isTeachingStaff: boolean;
            employmentType: string | null;
            departmentId: string | null;
        };
    } & {
        id: string;
        status: string;
        tenantId: string;
        date: Date;
        markedByUserId: string;
        staffUserId: string;
    })[]>;
}
