import { PrismaService } from '../prisma/prisma.service';
export declare class StaffService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string): Promise<({
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
    findOne(tenantId: string, id: string): Promise<{
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
    create(tenantId: string, data: any): Promise<{
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
    update(tenantId: string, id: string, data: any): Promise<{
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
    delete(tenantId: string, id: string): Promise<{
        message: string;
    }>;
    findAllDepartments(tenantId: string): Promise<({
        _count: {
            staff: number;
        };
    } & {
        id: string;
        name: string;
        tenantId: string;
    })[]>;
    createDepartment(tenantId: string, data: any): Promise<{
        id: string;
        name: string;
        tenantId: string;
    }>;
}
