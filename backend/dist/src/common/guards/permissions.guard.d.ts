import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export declare const PERMISSIONS_KEY = "permissions";
export declare const RequirePermissions: (...permissions: string[]) => import("@nestjs/common").CustomDecorator<string>;
export declare class PermissionsGuard implements CanActivate {
    private reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
