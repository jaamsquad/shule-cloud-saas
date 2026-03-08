import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermissions) {
            return true;
        }

        const { user, tenantContext } = context.switchToHttp().getRequest();

        // Platform users (no tenant context) skip this or use different logic
        if (!tenantContext) return true;

        // Subscription check: if module is disabled in plan, block it
        const plan = tenantContext.subscription?.limitsSnapshot;
        const allowedModules = plan?.allowedModules || [];

        for (const permission of requiredPermissions) {
            const module = permission.split(':')[0];
            if (!allowedModules.includes(module)) {
                throw new ForbiddenException(`Module ${module} is not included in your current subscription plan.`);
            }
        }

        // Role-based check
        const userPermissions = user?.permissions || []; // To be attached by Auth strategy
        const hasPermission = requiredPermissions.every((permission) =>
            userPermissions.includes(permission),
        );

        if (!hasPermission) {
            throw new ForbiddenException('Insufficient permissions');
        }

        return true;
    }
}
