import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private config: ConfigService,
        private prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get('JWT_ACCESS_SECRET') || 'fallback_access_secret_for_safety',
        });
    }

    async validate(payload: any) {
        // ... (the rest is fine)
        if (payload.type !== 'tenant') return null;

        const user = await this.prisma.user.findFirst({
            where: {
                id: payload.sub,
                tenantId: payload.tenantId,
                status: 'active',
            },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true,
                            }
                        }
                    }
                },
                tenant: {
                    include: {
                        subscription: { include: { plan: true } },
                    }
                }
            }
        });

        if (!user) throw new UnauthorizedException('User not found or account deactivated');

        const permissions = new Set<string>();
        for (const r of user.roles) {
            for (const p of r.role.permissions) {
                permissions.add(p.permissionKey);
            }
        }

        return {
            userId: user.id,
            tenantId: user.tenantId,
            email: user.email,
            permissions: Array.from(permissions),
            tenantContext: {
                tenantId: user.tenantId,
                tenantSubdomain: user.tenant.subdomain,
                subscription: user.tenant.subscription,
            }
        };
    }
}
