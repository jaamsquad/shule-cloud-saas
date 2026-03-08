import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamsService {
    constructor(private prisma: PrismaService) { }

    // Question Bank
    async findAllQuestions(tenantId: string, query: any) {
        return this.prisma.questionBankItem.findMany({
            where: { tenantId, subjectId: query.subjectId || undefined },
            include: { subject: true, class: true },
        });
    }

    async createQuestion(tenantId: string, data: any) {
        return this.prisma.questionBankItem.create({
            data: { ...data, tenantId },
        });
    }

    async approveQuestion(tenantId: string, id: string, reviewedBy: string) {
        return this.prisma.questionBankItem.update({
            where: { id, tenantId },
            data: { status: 'approved', approvedBy: reviewedBy },
        });
    }

    // Exam Blueprints
    async findAllBlueprints(tenantId: string) {
        return this.prisma.examBlueprint.findMany({
            where: { tenantId },
            include: { class: true, term: true },
        });
    }

    async createBlueprint(tenantId: string, data: any) {
        return this.prisma.examBlueprint.create({
            data: { ...data, tenantId },
        });
    }

    // Exam Engine (Simplified for MVP)
    async generateExam(tenantId: string, blueprintId: string, generatedBy: string) {
        const blueprint = await this.prisma.examBlueprint.findFirst({
            where: { id: blueprintId, tenantId },
        });
        if (!blueprint) throw new NotFoundException('Blueprint not found');

        // Fetch pool of questions
        const questions = await this.prisma.questionBankItem.findMany({
            where: { tenantId, subjectId: blueprint.subjectId || undefined, status: 'approved' }
        });

        if (questions.length < 5) throw new Error('Not enough approved questions to generate paper');

        const shuffled = questions.sort(() => 0.5 - Math.random());
        const versions = ['A', 'B'];
        const papers: any[] = [];

        for (const v of versions) {
            const paper = await this.prisma.examPaper.create({
                data: {
                    tenantId,
                    blueprintId,
                    versionLabel: v,
                    title: `${blueprint.name} - Version ${v}`,
                    generatedBy,
                }
            });

            // Add 10 questions randomly
            const selected = shuffled.slice(0, 10).sort(() => 0.5 - Math.random());
            for (let i = 0; i < selected.length; i++) {
                await this.prisma.examPaperQuestion.create({
                    data: {
                        tenantId,
                        examPaperId: paper.id,
                        questionId: selected[i].id,
                        questionOrder: i + 1,
                    }
                });
            }
            papers.push(paper);
        }

        return papers;
    }

    async publishPaper(tenantId: string, paperId: string) {
        return this.prisma.examPaper.update({
            where: { id: paperId, tenantId },
            data: { status: 'published', publishedAt: new Date() },
        });
    }

    async submitScores(tenantId: string, paperId: string, scores: any[], gradedBy: string) {
        const ops = scores.map(s => this.prisma.studentExamScore.create({
            data: {
                tenantId,
                examPaperId: paperId,
                studentId: s.studentId,
                score: s.score,
                gradedBy,
            }
        }));
        return this.prisma.$transaction(ops);
    }
}
