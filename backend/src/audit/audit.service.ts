import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async logAction(tenantId: string, actorUserId: string, action: string, entityType: string, entityId?: string, metaJson?: any) {
        return this.prisma.auditLog.create({
            data: { tenantId, actorUserId, action, entityType, entityId, metaJson }
        });
    }

    async findAllLogs(tenantId: string, query: any) {
        return this.prisma.auditLog.findMany({
            where: { tenantId, action: query.action || undefined, actorUserId: query.userId || undefined },
            include: { user: { select: { email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
}
