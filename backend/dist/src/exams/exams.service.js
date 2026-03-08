"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ExamsService = class ExamsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllQuestions(tenantId, query) {
        return this.prisma.questionBankItem.findMany({
            where: { tenantId, subjectId: query.subjectId || undefined },
            include: { subject: true, class: true },
        });
    }
    async createQuestion(tenantId, data) {
        return this.prisma.questionBankItem.create({
            data: { ...data, tenantId },
        });
    }
    async approveQuestion(tenantId, id, reviewedBy) {
        return this.prisma.questionBankItem.update({
            where: { id, tenantId },
            data: { status: 'approved', approvedBy: reviewedBy },
        });
    }
    async findAllBlueprints(tenantId) {
        return this.prisma.examBlueprint.findMany({
            where: { tenantId },
            include: { class: true, term: true },
        });
    }
    async createBlueprint(tenantId, data) {
        return this.prisma.examBlueprint.create({
            data: { ...data, tenantId },
        });
    }
    async generateExam(tenantId, blueprintId, generatedBy) {
        const blueprint = await this.prisma.examBlueprint.findFirst({
            where: { id: blueprintId, tenantId },
        });
        if (!blueprint)
            throw new common_1.NotFoundException('Blueprint not found');
        const questions = await this.prisma.questionBankItem.findMany({
            where: { tenantId, subjectId: blueprint.subjectId || undefined, status: 'approved' }
        });
        if (questions.length < 5)
            throw new Error('Not enough approved questions to generate paper');
        const shuffled = questions.sort(() => 0.5 - Math.random());
        const versions = ['A', 'B'];
        const papers = [];
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
    async publishPaper(tenantId, paperId) {
        return this.prisma.examPaper.update({
            where: { id: paperId, tenantId },
            data: { status: 'published', publishedAt: new Date() },
        });
    }
    async submitScores(tenantId, paperId, scores, gradedBy) {
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
};
exports.ExamsService = ExamsService;
exports.ExamsService = ExamsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExamsService);
//# sourceMappingURL=exams.service.js.map