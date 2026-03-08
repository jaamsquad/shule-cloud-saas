import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
declare const OwnerJwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class OwnerJwtStrategy extends OwnerJwtStrategy_base {
    constructor(config: ConfigService);
    validate(payload: any): Promise<{
        userId: any;
        email: any;
    }>;
}
export declare const OWNER_ROLES_KEY = "owner_roles";
export declare const OwnerRoles: (...roles: string[]) => import("@nestjs/common").CustomDecorator<string>;
export declare class OwnerRolesGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
export {};
