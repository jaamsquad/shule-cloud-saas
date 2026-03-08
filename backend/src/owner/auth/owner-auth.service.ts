import { Injectable, UnauthorizedException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OwnerAuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private config: ConfigService,
    ) { }

    async register(dto: any) {
        const existing = await this.prisma.ownerUser.findUnique({
            where: { email: dto.email }
        });
        if (existing) throw new ConflictException('Email already registered');

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.ownerUser.create({
            data: {
                name: dto.name,
                email: dto.email,
                passwordHash: hashedPassword,
                status: 'active',
            }
        });

        const tokens = await this.getTokens(user.id, user.email);
        return tokens;
    }

    async login(dto: any) {
        const user = await this.prisma.ownerUser.findUnique({
            where: { email: dto.email }
        });

        if (!user) throw new UnauthorizedException('Invalid credentials');
        if (!user.isActive) throw new ForbiddenException('User is inactive');

        const pwMatches = await bcrypt.compare(dto.password, user.passwordHash);
        if (!pwMatches) throw new UnauthorizedException('Invalid credentials');

        const tokens = await this.getTokens(user.id, user.email);

        await this.prisma.ownerUser.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        return tokens;
    }

    async logout(userId: string) {
        return true;
    }

    async getMe(userId: string) {
        return this.prisma.ownerUser.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                lastLogin: true,
            }
        });
    }

    async changePassword(userId: string, dto: any) {
        const user = await this.prisma.ownerUser.findUnique({
            where: { id: userId }
        });

        if (!user) throw new UnauthorizedException('User not found');

        const matches = await bcrypt.compare(dto.oldPassword, user.passwordHash);
        if (!matches) throw new UnauthorizedException('Invalid old password');

        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

        await this.prisma.ownerUser.update({
            where: { id: userId },
            data: { passwordHash: hashedPassword }
        });

        return true;
    }

    async getTokens(userId: string, email: string) {
        const [at, rt] = await Promise.all([
            this.jwtService.signAsync(
                { sub: userId, email, type: 'owner' },
                {
                    secret: this.config.get('OWNER_JWT_SECRET'),
                    expiresIn: '1h'
                }
            ),
            this.jwtService.signAsync(
                { sub: userId, email, type: 'owner' },
                {
                    secret: this.config.get('OWNER_JWT_REFRESH_SECRET'),
                    expiresIn: '7d'
                }
            )
        ]);

        return { access_token: at, refresh_token: rt };
    }
}
