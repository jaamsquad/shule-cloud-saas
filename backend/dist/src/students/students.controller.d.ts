import { StudentsService } from './students.service';
export declare class StudentsController {
    private readonly studentsService;
    constructor(studentsService: StudentsService);
    findAll(req: any, query: any): Promise<({
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
    findOne(req: any, id: string): Promise<{
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
    create(req: any, data: any): Promise<{
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
    update(req: any, id: string, data: any): Promise<{
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
    delete(req: any, id: string): Promise<{
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
    bulkImport(req: any, data: {
        students: any[];
    }): Promise<{
        message: string;
    }>;
}
