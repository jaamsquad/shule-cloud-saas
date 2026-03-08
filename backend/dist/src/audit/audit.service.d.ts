import { PrismaService } from '../prisma/prisma.service';
export declare class AuditService {
    private prisma;
    constructor(prisma: PrismaService);
    logAction(tenantId: string, actorUserId: string, action: string, entityType: string, entityId?: string, metaJson?: any): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        action: string;
        entityType: string;
        entityId: string | null;
        metaJson: import("@prisma/client/runtime/library").JsonValue | null;
        actorUserId: string;
    }>;
    findAllLogs(tenantId: string, query: any): Promise<({
        user: {
            email: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        tenantId: string;
        action: string;
        entityType: string;
        entityId: string | null;
        metaJson: import("@prisma/client/runtime/library").JsonValue | null;
        actorUserId: string;
    })[]>;
}
