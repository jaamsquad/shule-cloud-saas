import { PrismaService } from '../../prisma/prisma.service';
export declare class OwnerSubscriptionService {
    private prisma;
    constructor(prisma: PrismaService);
    assignPlan(tenantId: string, planId: string): Promise<{
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
    }>;
    extendTrial(tenantId: string, days: number): Promise<{
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
    }>;
    getSubscription(tenantId: string): Promise<({
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
    }) | null>;
}
