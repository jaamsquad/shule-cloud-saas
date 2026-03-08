import { PrismaService } from '../prisma/prisma.service';
export declare class GuardiansService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string): Promise<({
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
    create(tenantId: string, data: any): Promise<{
        id: string;
        email: string | null;
        tenantId: string;
        phone: string | null;
        fullName: string;
        relation: string | null;
    }>;
    findOne(tenantId: string, id: string): Promise<{
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
