import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OwnerPlansService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.plan.findMany({
            orderBy: { priceMonthly: 'asc' }
        });
    }

    async findOne(id: string) {
        const plan = await this.prisma.plan.findUnique({ where: { id } });
        if (!plan) throw new NotFoundException('Plan not found');
        return plan;
    }

    async create(dto: any) {
        return this.prisma.plan.create({ data: dto });
    }

    async update(id: string, dto: any) {
        return this.prisma.plan.update({
            where: { id },
            data: dto
        });
    }

    async delete(id: string) {
        return this.prisma.plan.delete({ where: { id } });
    }
}
