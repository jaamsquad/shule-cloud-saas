import { PrismaService } from '../../prisma/prisma.service';
export declare class OwnerAuditService {
    private prisma;
    constructor(prisma: PrismaService);
    log(ownerUserId: string | null, action: string, entityType?: string, entityId?: string, metaJson?: any): Promise<{
        id: string;
        createdAt: Date;
        action: string;
        entityType: string | null;
        entityId: string | null;
        metaJson: import("@prisma/client/runtime/library").JsonValue | null;
        ownerUserId: string | null;
    }>;
    findAll(): Promise<({
        ownerUser: {
            name: string | null;
            email: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        action: string;
        entityType: string | null;
        entityId: string | null;
        metaJson: import("@prisma/client/runtime/library").JsonValue | null;
        ownerUserId: string | null;
    })[]>;
}
