import { Injectable, UnauthorizedException, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OwnerJwtStrategy extends PassportStrategy(Strategy, 'owner-jwt') {
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get('OWNER_JWT_SECRET') || 'fallback_secret',
        });
    }

    async validate(payload: any) {
        if (payload.type !== 'owner') {
            throw new UnauthorizedException('Invalid platform token');
        }
        return { userId: payload.sub, email: payload.email };
    }
}

export const OWNER_ROLES_KEY = 'owner_roles';
export const OwnerRoles = (...roles: string[]) => SetMetadata(OWNER_ROLES_KEY, roles);

@Injectable()
export class OwnerRolesGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        return true; // Simplified for MVP
    }
}
