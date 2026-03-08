import { FinanceService } from './finance.service';
export declare class FinanceController {
    private readonly financeService;
    constructor(financeService: FinanceService);
    findAllFeeStructures(req: any): Promise<({
        term: {
            id: string;
            name: string;
            tenantId: string;
            startDate: Date;
            endDate: Date;
            academicYearId: string;
            isCurrent: boolean;
        };
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
        tenantId: string;
        termId: string;
        classId: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        voteheadsJson: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    createFeeStructure(req: any, data: any): Promise<{
        id: string;
        tenantId: string;
        termId: string;
        classId: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        voteheadsJson: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    findAllInvoices(req: any, query: any): Promise<({
        term: {
            id: string;
            name: string;
            tenantId: string;
            startDate: Date;
            endDate: Date;
            academicYearId: string;
            isCurrent: boolean;
        };
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
    })[]>;
    createInvoice(req: any, data: any): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        studentId: string;
        termId: string;
        invoiceNo: string;
    }>;
    recordPayment(req: any, data: any): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        paymentId: string;
        receiptNo: string;
        pdfUrl: string | null;
    }>;
    findAllReceipts(req: any): Promise<({
        payment: {
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
        };
    } & {
        id: string;
        createdAt: Date;
        tenantId: string;
        paymentId: string;
        receiptNo: string;
        pdfUrl: string | null;
    })[]>;
}
