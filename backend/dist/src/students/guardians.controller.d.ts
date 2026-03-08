import { GuardiansService } from './guardians.service';
export declare class GuardiansController {
    private readonly guardiansService;
    constructor(guardiansService: GuardiansService);
    findAll(req: any): Promise<({
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
    } & {
        id: string;
        email: string | null;
        tenantId: string;
        phone: string | null;
        fullName: string;
        relation: string | null;
    })[]>;
    create(req: any, data: any): Promise<{
        id: string;
        email: string | null;
        tenantId: string;
        phone: string | null;
        fullName: string;
        relation: string | null;
    }>;
    findOne(req: any, id: string): Promise<{
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
    } & {
        id: string;
        email: string | null;
        tenantId: string;
        phone: string | null;
        fullName: string;
        relation: string | null;
    }>;
}
