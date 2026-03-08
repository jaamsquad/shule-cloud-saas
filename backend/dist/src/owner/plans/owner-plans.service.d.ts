import { PrismaService } from '../../prisma/prisma.service';
export declare class OwnerPlansService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        priceMonthly: import("@prisma/client/runtime/library").Decimal;
        billingCycle: string;
        maxStudents: number;
        moduleToggles: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        priceMonthly: import("@prisma/client/runtime/library").Decimal;
        billingCycle: string;
        maxStudents: number;
        moduleToggles: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    create(dto: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        priceMonthly: import("@prisma/client/runtime/library").Decimal;
        billingCycle: string;
        maxStudents: number;
        moduleToggles: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    update(id: string, dto: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        priceMonthly: import("@prisma/client/runtime/library").Decimal;
        billingCycle: string;
        maxStudents: number;
        moduleToggles: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    delete(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        priceMonthly: import("@prisma/client/runtime/library").Decimal;
        billingCycle: string;
        maxStudents: number;
        moduleToggles: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
}
