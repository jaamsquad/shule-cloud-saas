import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AcademicsService {
    constructor(private prisma: PrismaService) { }

    // Classes / Streams
    async findAllClasses(tenantId: string) {
        return this.prisma.schoolClass.findMany({
            where: { tenantId },
            include: {
                _count: { select: { students: true } },
                classTeacher: { include: { user: { select: { firstName: true, lastName: true } } } }
            },
            orderBy: [{ levelName: 'asc' }, { streamName: 'asc' }],
        });
    }

    async findOneClass(tenantId: string, id: string) {
        const cls = await this.prisma.schoolClass.findFirst({
            where: { id, tenantId },
            include: { students: true, classTeacher: true }
        });
        if (!cls) throw new NotFoundException('Class not found');
        return cls;
    }

    async createClass(tenantId: string, data: any) {
        return this.prisma.schoolClass.create({
            data: { ...data, tenantId },
        });
    }

    async updateClass(tenantId: string, id: string, data: any) {
        return this.prisma.schoolClass.update({
            where: { id, tenantId },
            data,
        });
    }

    async deleteClass(tenantId: string, id: string) {
        return this.prisma.schoolClass.delete({ where: { id, tenantId } });
    }

    // Subjects / Learning Areas
    async findAllSubjects(tenantId: string) {
        return this.prisma.subject.findMany({
            where: { tenantId },
            include: { strands: true },
            orderBy: [{ levelName: 'asc' }, { name: 'asc' }],
        });
    }

    async createSubject(tenantId: string, data: any) {
        return this.prisma.subject.create({
            data: { ...data, tenantId },
        });
    }

    async deleteSubject(tenantId: string, id: string) {
        return this.prisma.subject.delete({ where: { id, tenantId } });
    }

    // CBC Strands
    async findAllStrands(tenantId: string, subjectId?: string) {
        return this.prisma.cbcStrand.findMany({
            where: { tenantId, subjectId: subjectId || undefined },
            include: { subStrands: true, subject: true },
            orderBy: { name: 'asc' },
        });
    }

    async createStrand(tenantId: string, data: any) {
        return this.prisma.cbcStrand.create({
            data: { ...data, tenantId },
        });
    }

    // CBC Sub-Strands
    async createSubStrand(tenantId: string, data: any) {
        return this.prisma.cbcSubStrand.create({
            data: { ...data, tenantId },
        });
    }
}
