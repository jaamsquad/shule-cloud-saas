import { PrismaService } from '../prisma/prisma.service';
export declare class BasicModulesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllBooks(tenantId: string): Promise<{
        id: string;
        tenantId: string;
        title: string;
        author: string | null;
        isbn: string | null;
        quantity: number;
        available: number;
    }[]>;
    createBook(tenantId: string, data: any): Promise<{
        id: string;
        tenantId: string;
        title: string;
        author: string | null;
        isbn: string | null;
        quantity: number;
        available: number;
    }>;
    findAllTransport(tenantId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        tenantId: string;
        fee: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    createTransport(tenantId: string, data: any): Promise<{
        id: string;
        name: string;
        description: string | null;
        tenantId: string;
        fee: import("@prisma/client/runtime/library").Decimal;
    }>;
    findAllInventory(tenantId: string): Promise<{
        id: string;
        name: string;
        tenantId: string;
        quantity: number;
        category: string | null;
        unit: string | null;
    }[]>;
    createInventory(tenantId: string, data: any): Promise<{
        id: string;
        name: string;
        tenantId: string;
        quantity: number;
        category: string | null;
        unit: string | null;
    }>;
}
