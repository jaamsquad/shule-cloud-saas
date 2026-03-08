import { OwnerAuditService } from './owner-audit.service';
export declare class OwnerAuditController {
    private readonly auditService;
    constructor(auditService: OwnerAuditService);
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
