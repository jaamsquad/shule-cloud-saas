import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class AuthService {
    private prisma;
    private jwtService;
    private config;
    constructor(prisma: PrismaService, jwtService: JwtService, config: ConfigService);
    login(data: any): Promise<{
        user: {
            id: string;
            email: string | null;
            phone: string | null;
            permissions: string[];
        };
        tenant: {
            id: string;
            name: string;
            subdomain: string;
            theme: string | null;
            logoUrl: string | null;
        };
        access_token: string;
        refresh_token: string;
    }>;
    refreshToken(userId: string, tenantId: string, email: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    private getTokens;
}
