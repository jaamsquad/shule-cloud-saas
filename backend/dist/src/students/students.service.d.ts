import { PrismaService } from '../prisma/prisma.service';
export declare class StudentsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string, query: any): Promise<({
        guardian: {
            id: string;
            email: string | null;
            tenantId: string;
            phone: string | null;
            fullName: string;
            relation: string | null;
        } | null;
        class: {
            id: string;
            tenantId: string;
            levelType: string;
            levelName: string;
            streamName: string;
            capacity: number;
            classTeacherId: string | null;
        };
    } & {
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
    })[]>;
    findOne(tenantId: string, id: string): Promise<{
        guardian: {
            id: string;
            email: string | null;
            tenantId: string;
            phone: string | null;
            fullName: string;
            relation: string | null;
        } | null;
        invoices: {
            id: string;
            status: string;
            createdAt: Date;
            tenantId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            studentId: string;
            termId: string;
            invoiceNo: string;
        }[];
        class: {
            id: string;
            tenantId: string;
            levelType: string;
            levelName: string;
            streamName: string;
            capacity: number;
            classTeacherId: string | null;
        };
        attendance: {
            id: string;
            status: string;
            tenantId: string;
            studentId: string;
            classId: string;
            date: Date;
            markedByUserId: string;
        }[];
        examScores: ({
            examPaper: {
                id: string;
                status: string;
                tenantId: string;
                blueprintId: string;
                versionLabel: string;
                title: string;
                generatedBy: string;
                approvedBy: string | null;
                publishedAt: Date | null;
            };
        } & {
            id: string;
            createdAt: Date;
            tenantId: string;
            studentId: string;
            examPaperId: string;
            score: import("@prisma/client/runtime/library").Decimal;
            gradedBy: string;
        })[];
    } & {
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
    }>;
    create(tenantId: string, data: any): Promise<{
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
    }>;
    update(tenantId: string, id: string, data: any): Promise<{
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
    }>;
    delete(tenantId: string, id: string): Promise<{
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
    }>;
    bulkImport(tenantId: string, students: any[]): Promise<{
        message: string;
    }>;
}
