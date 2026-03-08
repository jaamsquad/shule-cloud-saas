import { ExamsService } from './exams.service';
export declare class ExamsController {
    private readonly examsService;
    constructor(examsService: ExamsService);
    findAllQuestions(req: any, query: any): Promise<({
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
    createQuestion(req: any, data: any): Promise<{
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
    approveQuestion(req: any, id: string): Promise<{
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
    findAllBlueprints(req: any): Promise<({
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
    createBlueprint(req: any, data: any): Promise<{
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
    generateExam(req: any, blueprintId: string): Promise<any[]>;
    publishPaper(req: any, id: string): Promise<{
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
    submitScores(req: any, id: string, scores: any[]): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        studentId: string;
        examPaperId: string;
        score: import("@prisma/client/runtime/library").Decimal;
        gradedBy: string;
    }[]>;
}
