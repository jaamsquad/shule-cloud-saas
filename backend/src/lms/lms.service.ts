import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LmsService {
    constructor(private prisma: PrismaService) { }

    // Courses
    async findAllCourses(tenantId: string, query: any) {
        return this.prisma.lMSCourse.findMany({
            where: { tenantId, subjectId: query.subjectId || undefined, classId: query.classId || undefined },
            include: { subject: true, class: true },
        });
    }

    async createCourse(tenantId: string, data: any, createdBy: string) {
        return this.prisma.lMSCourse.create({
            data: { ...data, tenantId, createdBy },
        });
    }

    async findCourseDetail(tenantId: string, id: string) {
        return this.prisma.lMSCourse.findFirst({
            where: { id, tenantId },
            include: {
                modules: {
                    include: { lessons: { include: { materials: true } } },
                    orderBy: { orderNo: 'asc' },
                },
                assignments: true,
                quizzes: true,
            }
        });
    }

    // Assignments
    async createAssignment(tenantId: string, data: any) {
        return this.prisma.assignment.create({
            data: { ...data, tenantId },
        });
    }

    async submitAssignment(tenantId: string, studentId: string, data: any) {
        return this.prisma.assignmentSubmission.create({
            data: { ...data, tenantId, studentId },
        });
    }

    // Quizzes
    async createQuiz(tenantId: string, data: any) {
        const { questions, ...quizData } = data;
        return this.prisma.$transaction(async (tx) => {
            const quiz = await tx.quiz.create({
                data: { ...quizData, tenantId },
            });
            if (questions && questions.length > 0) {
                for (const q of questions) {
                    await tx.quizQuestion.create({
                        data: { ...q, tenantId, quizId: quiz.id },
                    });
                }
            }
            return quiz;
        });
    }
}
