import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    findAllLogs(req: any, query: any): Promise<({
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
