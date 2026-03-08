import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GuardiansService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string) {
        return this.prisma.guardian.findMany({
            where: { tenantId },
            include: { students: true }
        });
    }

    async create(tenantId: string, data: any) {
        return this.prisma.guardian.create({
            data: { ...data, tenantId },
        });
    }

    async findOne(tenantId: string, id: string) {
        const guardian = await this.prisma.guardian.findFirst({
            where: { id, tenantId },
            include: { students: true }
        });
        if (!guardian) throw new NotFoundException('Guardian not found');
        return guardian;
    }
}
