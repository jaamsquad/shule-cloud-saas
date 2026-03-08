import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class SubscriptionGuard implements CanActivate {
    canActivate(context: ExecutionContext): Promise<boolean>;
}
