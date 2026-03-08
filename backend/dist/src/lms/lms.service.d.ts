import { PrismaService } from '../prisma/prisma.service';
export declare class LmsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllCourses(tenantId: string, query: any): Promise<({
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
    createCourse(tenantId: string, data: any, createdBy: string): Promise<{
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
    findCourseDetail(tenantId: string, id: string): Promise<({
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
    createAssignment(tenantId: string, data: any): Promise<{
        id: string;
        status: string;
        tenantId: string;
        title: string;
        totalMarks: number;
        instructions: string | null;
        dueAt: Date | null;
        courseId: string;
    }>;
    submitAssignment(tenantId: string, studentId: string, data: any): Promise<{
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
    createQuiz(tenantId: string, data: any): Promise<{
        id: string;
        status: string;
        tenantId: string;
        title: string;
        totalMarks: number;
        durationMinutes: number;
        courseId: string;
    }>;
}
