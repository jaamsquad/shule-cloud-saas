import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class OwnerAuthService {
    private prisma;
    private jwtService;
    private config;
    constructor(prisma: PrismaService, jwtService: JwtService, config: ConfigService);
    register(dto: any): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    login(dto: any): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    logout(userId: string): Promise<boolean>;
    getMe(userId: string): Promise<{
        id: string;
        name: string | null;
        email: string;
        isActive: boolean;
        lastLogin: Date | null;
    } | null>;
    changePassword(userId: string, dto: any): Promise<boolean>;
    getTokens(userId: string, email: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
}
