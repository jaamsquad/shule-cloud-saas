import { LmsService } from './lms.service';
export declare class LmsController {
    private readonly lmsService;
    constructor(lmsService: LmsService);
    findAll(req: any, query: any): Promise<({
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
        description: string | null;
        tenantId: string;
        classId: string;
        title: string;
        publishedAt: Date | null;
        subjectId: string;
        createdBy: string;
    })[]>;
    findOne(req: any, id: string): Promise<({
        assignments: {
            id: string;
            status: string;
            tenantId: string;
            title: string;
            totalMarks: number;
            instructions: string | null;
            dueAt: Date | null;
            courseId: string;
        }[];
        quizzes: {
            id: string;
            status: string;
            tenantId: string;
            title: string;
            totalMarks: number;
            durationMinutes: number;
            courseId: string;
        }[];
        modules: ({
            lessons: ({
                materials: {
                    id: string;
                    tenantId: string;
                    title: string;
                    fileUrl: string;
                    lessonId: string;
                    fileType: string | null;
                }[];
            } & {
                id: string;
                status: string;
                tenantId: string;
                title: string;
                orderNo: number;
                moduleId: string;
                contentHtml: string | null;
            })[];
        } & {
            id: string;
            tenantId: string;
            title: string;
            orderNo: number;
            courseId: string;
        })[];
    } & {
        id: string;
        status: string;
        description: string | null;
        tenantId: string;
        classId: string;
        title: string;
        publishedAt: Date | null;
        subjectId: string;
        createdBy: string;
    }) | null>;
    create(req: any, data: any): Promise<{
        id: string;
        status: string;
        description: string | null;
        tenantId: string;
        classId: string;
        title: string;
        publishedAt: Date | null;
        subjectId: string;
        createdBy: string;
    }>;
    createAssignment(req: any, data: any): Promise<{
        id: string;
        status: string;
        tenantId: string;
        title: string;
        totalMarks: number;
        instructions: string | null;
        dueAt: Date | null;
        courseId: string;
    }>;
    submitAssignment(req: any, data: any): Promise<{
        id: string;
        tenantId: string;
        studentId: string;
        score: import("@prisma/client/runtime/library").Decimal | null;
        gradedBy: string | null;
        fileUrl: string | null;
        textAnswer: string | null;
        submittedAt: Date;
        assignmentId: string;
    }>;
    createQuiz(req: any, data: any): Promise<{
        id: string;
        status: string;
        tenantId: string;
        title: string;
        totalMarks: number;
        durationMinutes: number;
        courseId: string;
    }>;
}
