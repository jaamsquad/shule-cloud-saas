import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OwnerTenantsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.tenant.findMany({
            include: {
                subscription: { include: { plan: true } },
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id },
            include: {
                subscription: { include: { plan: true } },
            }
        });
        if (!tenant) throw new NotFoundException('Tenant not found');
        return tenant;
    }

    async create(dto: any) {
        const subdomain = dto.subdomain.toLowerCase().trim();
        const exists = await this.prisma.tenant.findUnique({ where: { subdomain } });
        if (exists) throw new BadRequestException('Subdomain already in use');

        return this.prisma.tenant.create({
            data: {
                name: dto.name,
                subdomain,
                contactEmail: dto.contactEmail,
                contactPhone: dto.contactPhone,
                status: 'active',
            }
        });
    }

    async update(id: string, dto: any) {
        return this.prisma.tenant.update({
            where: { id },
            data: dto
        });
    }

    async setStatus(id: string, status: string) {
        return this.prisma.tenant.update({
            where: { id },
            data: { status }
        });
    }
}
