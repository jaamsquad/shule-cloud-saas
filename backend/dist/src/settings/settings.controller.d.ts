import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
    getSchool(req: any): Promise<{
        updatedAt: Date;
        tenantId: string;
        jsonSettings: import("@prisma/client/runtime/library").JsonValue;
    } | null>;
    updateSchool(req: any, data: any): Promise<{
        updatedAt: Date;
        tenantId: string;
        jsonSettings: import("@prisma/client/runtime/library").JsonValue;
    }>;
    findAllAY(req: any): Promise<({
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
    createAY(req: any, data: any): Promise<{
        id: string;
        name: string;
        tenantId: string;
        startDate: Date;
        endDate: Date;
        isCurrent: boolean;
    }>;
    setTermCurrent(req: any, id: string): Promise<{
        id: string;
        name: string;
        tenantId: string;
        startDate: Date;
        endDate: Date;
        academicYearId: string;
        isCurrent: boolean;
    }>;
}
