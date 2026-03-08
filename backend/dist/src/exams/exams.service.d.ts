import { PrismaService } from '../prisma/prisma.service';
export declare class ExamsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllQuestions(tenantId: string, query: any): Promise<({
        subject: {
            id: string;
            name: string;
            tenantId: string;
            levelType: string;
            levelName: string;
            code: string | null;
        };
        class: {
            id: string;
            tenantId: string;
            levelType: string;
            levelName: string;
            streamName: string;
            capacity: number;
            classTeacherId: string | null;
        };
    } & {
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        classId: string;
        approvedBy: string | null;
        type: string;
        subjectId: string;
        strandId: string | null;
        subStrandId: string | null;
        topic: string | null;
        difficulty: string;
        bloomLevel: string;
        marks: number;
        questionText: string;
        optionsJson: import("@prisma/client/runtime/library").JsonValue | null;
        answerJson: import("@prisma/client/runtime/library").JsonValue | null;
        createdBy: string;
        reviewedBy: string | null;
    })[]>;
    createQuestion(tenantId: string, data: any): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        classId: string;
        approvedBy: string | null;
        type: string;
        subjectId: string;
        strandId: string | null;
        subStrandId: string | null;
        topic: string | null;
        difficulty: string;
        bloomLevel: string;
        marks: number;
        questionText: string;
        optionsJson: import("@prisma/client/runtime/library").JsonValue | null;
        answerJson: import("@prisma/client/runtime/library").JsonValue | null;
        createdBy: string;
        reviewedBy: string | null;
    }>;
    approveQuestion(tenantId: string, id: string, reviewedBy: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        classId: string;
        approvedBy: string | null;
        type: string;
        subjectId: string;
        strandId: string | null;
        subStrandId: string | null;
        topic: string | null;
        difficulty: string;
        bloomLevel: string;
        marks: number;
        questionText: string;
        optionsJson: import("@prisma/client/runtime/library").JsonValue | null;
        answerJson: import("@prisma/client/runtime/library").JsonValue | null;
        createdBy: string;
        reviewedBy: string | null;
    }>;
    findAllBlueprints(tenantId: string): Promise<({
        term: {
            id: string;
            name: string;
            tenantId: string;
            startDate: Date;
            endDate: Date;
            academicYearId: string;
            isCurrent: boolean;
        };
        class: {
            id: string;
            tenantId: string;
            levelType: string;
            levelName: string;
            streamName: string;
            capacity: number;
            classTeacherId: string | null;
        };
    } & {
        id: string;
        name: string;
        status: string;
        tenantId: string;
        termId: string;
        classId: string;
        subjectId: string | null;
        totalMarks: number;
        durationMinutes: number;
        rulesJson: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    createBlueprint(tenantId: string, data: any): Promise<{
        id: string;
        name: string;
        status: string;
        tenantId: string;
        termId: string;
        classId: string;
        subjectId: string | null;
        totalMarks: number;
        durationMinutes: number;
        rulesJson: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    generateExam(tenantId: string, blueprintId: string, generatedBy: string): Promise<any[]>;
    publishPaper(tenantId: string, paperId: string): Promise<{
        id: string;
        status: string;
        tenantId: string;
        blueprintId: string;
        versionLabel: string;
        title: string;
        generatedBy: string;
        approvedBy: string | null;
        publishedAt: Date | null;
    }>;
    submitScores(tenantId: string, paperId: string, scores: any[], gradedBy: string): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        studentId: string;
        examPaperId: string;
        score: import("@prisma/client/runtime/library").Decimal;
        gradedBy: string;
    }[]>;
}
