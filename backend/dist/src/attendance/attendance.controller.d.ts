import { AttendanceService } from './attendance.service';
export declare class AttendanceController {
    private readonly attendanceService;
    constructor(attendanceService: AttendanceService);
    markStudent(req: any, data: any): Promise<{
        id: string;
        status: string;
        tenantId: string;
        studentId: string;
        classId: string;
        date: Date;
        markedByUserId: string;
    }>;
    getStudentReport(req: any, query: any): Promise<({
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
    markStaff(req: any, data: any): Promise<{
        id: string;
        status: string;
        tenantId: string;
        date: Date;
        markedByUserId: string;
        staffUserId: string;
    }>;
    getStaffReport(req: any, query: any): Promise<({
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
