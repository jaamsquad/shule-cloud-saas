import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OwnerAuditService {
    constructor(private prisma: PrismaService) { }

    async log(ownerUserId: string | null, action: string, entityType?: string, entityId?: string, metaJson?: any) {
        return this.prisma.platformAuditLog.create({
            data: {
                ownerUserId,
                action,
                entityType,
                entityId,
                metaJson
            }
        });
    }

    async findAll() {
        return this.prisma.platformAuditLog.findMany({
            include: { ownerUser: { select: { email: true, name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
    }
}
