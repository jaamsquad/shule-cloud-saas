import { PrismaService } from '../prisma/prisma.service';
export declare class AcademicsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllClasses(tenantId: string): Promise<({
        _count: {
            students: number;
        };
        classTeacher: ({
            user: {
                firstName: string | null;
                lastName: string | null;
            };
        } & {
            id: string;
            userId: string;
            tenantId: string;
            title: string | null;
            staffNo: string;
            designation: string | null;
            isTeachingStaff: boolean;
            employmentType: string | null;
            departmentId: string | null;
        }) | null;
    } & {
        id: string;
        tenantId: string;
        levelType: string;
        levelName: string;
        streamName: string;
        capacity: number;
        classTeacherId: string | null;
    })[]>;
    findOneClass(tenantId: string, id: string): Promise<{
        students: {
            id: string;
            status: string;
            tenantId: string;
            firstName: string;
            lastName: string;
            admNo: string;
            gender: string | null;
            dob: Date | null;
            classId: string;
            guardianId: string | null;
        }[];
        classTeacher: {
            id: string;
            userId: string;
            tenantId: string;
            title: string | null;
            staffNo: string;
            designation: string | null;
            isTeachingStaff: boolean;
            employmentType: string | null;
            departmentId: string | null;
        } | null;
    } & {
        id: string;
        tenantId: string;
        levelType: string;
        levelName: string;
        streamName: string;
        capacity: number;
        classTeacherId: string | null;
    }>;
    createClass(tenantId: string, data: any): Promise<{
        id: string;
        tenantId: string;
        levelType: string;
        levelName: string;
        streamName: string;
        capacity: number;
        classTeacherId: string | null;
    }>;
    updateClass(tenantId: string, id: string, data: any): Promise<{
        id: string;
        tenantId: string;
        levelType: string;
        levelName: string;
        streamName: string;
        capacity: number;
        classTeacherId: string | null;
    }>;
    deleteClass(tenantId: string, id: string): Promise<{
        id: string;
        tenantId: string;
        levelType: string;
        levelName: string;
        streamName: string;
        capacity: number;
        classTeacherId: string | null;
    }>;
    findAllSubjects(tenantId: string): Promise<({
        strands: {
            id: string;
            name: string;
            tenantId: string;
            subjectId: string;
        }[];
    } & {
        id: string;
        name: string;
        tenantId: string;
        levelType: string;
        levelName: string;
        code: string | null;
    })[]>;
    createSubject(tenantId: string, data: any): Promise<{
        id: string;
        name: string;
        tenantId: string;
        levelType: string;
        levelName: string;
        code: string | null;
    }>;
    deleteSubject(tenantId: string, id: string): Promise<{
        id: string;
        name: string;
        tenantId: string;
        levelType: string;
        levelName: string;
        code: string | null;
    }>;
    findAllStrands(tenantId: string, subjectId?: string): Promise<({
        subject: {
            id: string;
            name: string;
            tenantId: string;
            levelType: string;
            levelName: string;
            code: string | null;
        };
        subStrands: {
            id: string;
            name: string;
            tenantId: string;
            strandId: string;
        }[];
    } & {
        id: string;
        name: string;
        tenantId: string;
        subjectId: string;
    })[]>;
    createStrand(tenantId: string, data: any): Promise<{
        id: string;
        name: string;
        tenantId: string;
        subjectId: string;
    }>;
    createSubStrand(tenantId: string, data: any): Promise<{
        id: string;
        name: string;
        tenantId: string;
        strandId: string;
    }>;
}
