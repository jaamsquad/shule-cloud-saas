import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SubscriptionGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { tenantContext, method } = context.switchToHttp().getRequest();

        if (!tenantContext) return true; // Platform routes handled separately

        const subscription = tenantContext.subscription;
        if (!subscription) {
            throw new ForbiddenException('No active subscription found for this tenant.');
        }

        const status = subscription.status; // trial, active, past_due, suspended, cancelled

        if (status === 'suspended' && method !== 'GET') {
            throw new ForbiddenException('Your subscription is suspended. Mutating actions are blocked.');
        }

        if (status === 'cancelled') {
            throw new ForbiddenException('Your subscription has been cancelled. Access is restricted.');
        }

        return true;
    }
}
