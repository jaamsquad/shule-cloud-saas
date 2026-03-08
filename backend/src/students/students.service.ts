import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string, query: any) {
        const { search, classId, status } = query;
        return this.prisma.student.findMany({
            where: {
                tenantId,
                classId: classId ? classId : undefined,
                status: status ? status : undefined,
                OR: search ? [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { admNo: { contains: search, mode: 'insensitive' } },
                ] : undefined,
            },
            include: {
                class: true,
                guardian: true,
            }
        });
    }

    async findOne(tenantId: string, id: string) {
        const student = await this.prisma.student.findFirst({
            where: { id, tenantId },
            include: {
                class: true,
                guardian: true,
                attendance: true,
                examScores: { include: { examPaper: true } },
                invoices: true,
            }
        });
        if (!student) throw new NotFoundException('Student not found');
        return student;
    }

    async create(tenantId: string, data: any) {
        return this.prisma.student.create({
            data: {
                ...data,
                tenantId,
            }
        });
    }

    async update(tenantId: string, id: string, data: any) {
        return this.prisma.student.update({
            where: { id, tenantId },
            data,
        });
    }

    async delete(tenantId: string, id: string) {
        return this.prisma.student.delete({
            where: { id, tenantId },
        });
    }

    async bulkImport(tenantId: string, students: any[]) {
        return this.prisma.$transaction(async (tx) => {
            for (const s of students) {
                await tx.student.create({
                    data: {
                        ...s,
                        tenantId,
                    }
                });
            }
            return { message: `${students.length} students imported` };
        });
    }
}
