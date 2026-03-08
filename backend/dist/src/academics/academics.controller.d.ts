import { AcademicsService } from './academics.service';
export declare class AcademicsController {
    private readonly academicsService;
    constructor(academicsService: AcademicsService);
    findAllClasses(req: any): Promise<({
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
    findOneClass(req: any, id: string): Promise<{
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
    createClass(req: any, data: any): Promise<{
        id: string;
        tenantId: string;
        levelType: string;
        levelName: string;
        streamName: string;
        capacity: number;
        classTeacherId: string | null;
    }>;
    updateClass(req: any, id: string, data: any): Promise<{
        id: string;
        tenantId: string;
        levelType: string;
        levelName: string;
        streamName: string;
        capacity: number;
        classTeacherId: string | null;
    }>;
    deleteClass(req: any, id: string): Promise<{
        id: string;
        tenantId: string;
        levelType: string;
        levelName: string;
        streamName: string;
        capacity: number;
        classTeacherId: string | null;
    }>;
    findAllSubjects(req: any): Promise<({
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
    createSubject(req: any, data: any): Promise<{
        id: string;
        name: string;
        tenantId: string;
        levelType: string;
        levelName: string;
        code: string | null;
    }>;
    deleteSubject(req: any, id: string): Promise<{
        id: string;
        name: string;
        tenantId: string;
        levelType: string;
        levelName: string;
        code: string | null;
    }>;
    findAllStrands(req: any, subjectId: string): Promise<({
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
    createStrand(req: any, data: any): Promise<{
        id: string;
        name: string;
        tenantId: string;
        subjectId: string;
    }>;
    createSubStrand(req: any, data: any): Promise<{
        id: string;
        name: string;
        tenantId: string;
        strandId: string;
    }>;
}
