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
exports.LmsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LmsService = class LmsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllCourses(tenantId, query) {
        return this.prisma.lMSCourse.findMany({
            where: { tenantId, subjectId: query.subjectId || undefined, classId: query.classId || undefined },
            include: { subject: true, class: true },
        });
    }
    async createCourse(tenantId, data, createdBy) {
        return this.prisma.lMSCourse.create({
            data: { ...data, tenantId, createdBy },
        });
    }
    async findCourseDetail(tenantId, id) {
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
    async createAssignment(tenantId, data) {
        return this.prisma.assignment.create({
            data: { ...data, tenantId },
        });
    }
    async submitAssignment(tenantId, studentId, data) {
        return this.prisma.assignmentSubmission.create({
            data: { ...data, tenantId, studentId },
        });
    }
    async createQuiz(tenantId, data) {
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
};
exports.LmsService = LmsService;
exports.LmsService = LmsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LmsService);
//# sourceMappingURL=lms.service.js.map