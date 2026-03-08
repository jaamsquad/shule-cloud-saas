import { OwnerTenantsService } from './owner-tenants.service';
export declare class OwnerTenantsController {
    private readonly tenantsService;
    constructor(tenantsService: OwnerTenantsService);
    findAll(): Promise<({
        subscription: ({
            plan: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                priceMonthly: import("@prisma/client/runtime/library").Decimal;
                billingCycle: string;
                maxStudents: number;
                moduleToggles: import("@prisma/client/runtime/library").JsonValue | null;
            };
        } & {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            planId: string;
            trialStart: Date;
            trialEnd: Date | null;
            currentPeriodStart: Date;
            currentPeriodEnd: Date | null;
        }) | null;
    } & {
        id: string;
        name: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        subdomain: string;
        contactEmail: string | null;
        contactPhone: string | null;
        logoUrl: string | null;
        theme: string | null;
    })[]>;
    findOne(id: string): Promise<{
        subscription: ({
            plan: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                priceMonthly: import("@prisma/client/runtime/library").Decimal;
                billingCycle: string;
                maxStudents: number;
                moduleToggles: import("@prisma/client/runtime/library").JsonValue | null;
            };
        } & {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            planId: string;
            trialStart: Date;
            trialEnd: Date | null;
            currentPeriodStart: Date;
            currentPeriodEnd: Date | null;
        }) | null;
    } & {
        id: string;
        name: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        subdomain: string;
        contactEmail: string | null;
        contactPhone: string | null;
        logoUrl: string | null;
        theme: string | null;
    }>;
    create(dto: any): Promise<{
        id: string;
        name: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        subdomain: string;
        contactEmail: string | null;
        contactPhone: string | null;
        logoUrl: string | null;
        theme: string | null;
    }>;
    update(id: string, dto: any): Promise<{
        id: string;
        name: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        subdomain: string;
        contactEmail: string | null;
        contactPhone: string | null;
        logoUrl: string | null;
        theme: string | null;
    }>;
    suspend(id: string): Promise<{
        id: string;
        name: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        subdomain: string;
        contactEmail: string | null;
        contactPhone: string | null;
        logoUrl: string | null;
        theme: string | null;
    }>;
    activate(id: string): Promise<{
        id: string;
        name: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        subdomain: string;
        contactEmail: string | null;
        contactPhone: string | null;
        logoUrl: string | null;
        theme: string | null;
    }>;
    cancel(id: string): Promise<{
        id: string;
        name: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        subdomain: string;
        contactEmail: string | null;
        contactPhone: string | null;
        logoUrl: string | null;
        theme: string | null;
    }>;
}
