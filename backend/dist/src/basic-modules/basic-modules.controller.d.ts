import { BasicModulesService } from './basic-modules.service';
export declare class BasicModulesController {
    private readonly modulesService;
    constructor(modulesService: BasicModulesService);
    findAllBooks(req: any): Promise<{
        id: string;
        tenantId: string;
        title: string;
        author: string | null;
        isbn: string | null;
        quantity: number;
        available: number;
    }[]>;
    createBook(req: any, data: any): Promise<{
        id: string;
        tenantId: string;
        title: string;
        author: string | null;
        isbn: string | null;
        quantity: number;
        available: number;
    }>;
    findAllTransport(req: any): Promise<{
        id: string;
        name: string;
        description: string | null;
        tenantId: string;
        fee: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    createTransport(req: any, data: any): Promise<{
        id: string;
        name: string;
        description: string | null;
        tenantId: string;
        fee: import("@prisma/client/runtime/library").Decimal;
    }>;
    findAllInventory(req: any): Promise<{
        id: string;
        name: string;
        tenantId: string;
        quantity: number;
        category: string | null;
        unit: string | null;
    }[]>;
    createInventory(req: any, data: any): Promise<{
        id: string;
        name: string;
        tenantId: string;
        quantity: number;
        category: string | null;
        unit: string | null;
    }>;
}
