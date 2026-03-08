import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async getSchoolSettings(tenantId: string) {
        return this.prisma.schoolSetting.findUnique({ where: { tenantId } });
    }

    async updateSchoolSettings(tenantId: string, jsonSettings: any) {
        return this.prisma.schoolSetting.upsert({
            where: { tenantId },
            update: { jsonSettings },
            create: { tenantId, jsonSettings },
        });
    }

    async findAllAcademicYears(tenantId: string) {
        return this.prisma.academicYear.findMany({
            where: { tenantId },
            include: { terms: true },
            orderBy: { startDate: 'desc' },
        });
    }

    async createAcademicYear(tenantId: string, data: any) {
        const { name, startDate, endDate, terms } = data;
        return this.prisma.academicYear.create({
            data: {
                tenantId,
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                terms: {
                    create: terms.map(t => ({
                        tenantId,
                        name: t.name,
                        startDate: new Date(t.startDate),
                        endDate: new Date(t.endDate),
                    }))
                }
            }
        });
    }

    async setTermCurrent(tenantId: string, termId: string) {
        return this.prisma.$transaction(async (tx) => {
            await tx.term.updateMany({ where: { tenantId }, data: { isCurrent: false } });
            return tx.term.update({ where: { id: termId, tenantId }, data: { isCurrent: true } });
        });
    }
}
