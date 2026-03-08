import { StaffService } from './staff.service';
export declare class StaffController {
    private readonly staffService;
    constructor(staffService: StaffService);
    findAll(req: any): Promise<({
        user: {
            email: string | null;
            status: string;
            phone: string | null;
            firstName: string | null;
            lastName: string | null;
        };
        department: {
            id: string;
            name: string;
            tenantId: string;
        } | null;
        _count: {
            classesTaught: number;
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
    })[]>;
    findAllDepartments(req: any): Promise<({
        _count: {
            staff: number;
        };
    } & {
        id: string;
        name: string;
        tenantId: string;
    })[]>;
    create(req: any, data: any): Promise<{
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
        department: {
            id: string;
            name: string;
            tenantId: string;
        } | null;
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
    }>;
    update(req: any, id: string, data: any): Promise<{
        id: string;
        userId: string;
        tenantId: string;
        title: string | null;
        staffNo: string;
        designation: string | null;
        isTeachingStaff: boolean;
        employmentType: string | null;
        departmentId: string | null;
    }>;
    patch(req: any, id: string, data: any): Promise<{
        id: string;
        userId: string;
        tenantId: string;
        title: string | null;
        staffNo: string;
        designation: string | null;
        isTeachingStaff: boolean;
        employmentType: string | null;
        departmentId: string | null;
    }>;
    delete(req: any, id: string): Promise<{
        message: string;
    }>;
    createDepartment(req: any, data: {
        name: string;
    }): Promise<{
        id: string;
        name: string;
        tenantId: string;
    }>;
}
