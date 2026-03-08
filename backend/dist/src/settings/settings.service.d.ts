import { PrismaService } from '../prisma/prisma.service';
export declare class SettingsService {
    private prisma;
    constructor(prisma: PrismaService);
    getSchoolSettings(tenantId: string): Promise<{
        updatedAt: Date;
        tenantId: string;
        jsonSettings: import("@prisma/client/runtime/library").JsonValue;
    } | null>;
    updateSchoolSettings(tenantId: string, jsonSettings: any): Promise<{
        updatedAt: Date;
        tenantId: string;
        jsonSettings: import("@prisma/client/runtime/library").JsonValue;
    }>;
    findAllAcademicYears(tenantId: string): Promise<({
        terms: {
            id: string;
            name: string;
            tenantId: string;
            startDate: Date;
            endDate: Date;
            academicYearId: string;
            isCurrent: boolean;
        }[];
    } & {
        id: string;
        name: string;
        tenantId: string;
        startDate: Date;
        endDate: Date;
        isCurrent: boolean;
    })[]>;
    createAcademicYear(tenantId: string, data: any): Promise<{
        id: string;
        name: string;
        tenantId: string;
        startDate: Date;
        endDate: Date;
        isCurrent: boolean;
    }>;
    setTermCurrent(tenantId: string, termId: string): Promise<{
        id: string;
        name: string;
        tenantId: string;
        startDate: Date;
        endDate: Date;
        academicYearId: string;
        isCurrent: boolean;
    }>;
}
