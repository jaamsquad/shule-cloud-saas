import { PrismaService } from '../prisma/prisma.service';
export declare class OnboardService {
    private prisma;
    constructor(prisma: PrismaService);
    checkSubdomain(subdomain: string): Promise<{
        available: boolean;
        message: string;
    }>;
    registerTenant(data: any): Promise<{
        message: string;
        tenant: {
            id: string;
            name: string;
            subdomain: string;
            loginUrl: string;
        };
    }>;
}
