"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionGuard = void 0;
const common_1 = require("@nestjs/common");
let SubscriptionGuard = class SubscriptionGuard {
    async canActivate(context) {
        const { tenantContext, method } = context.switchToHttp().getRequest();
        if (!tenantContext)
            return true;
        const subscription = tenantContext.subscription;
        if (!subscription) {
            throw new common_1.ForbiddenException('No active subscription found for this tenant.');
        }
        const status = subscription.status;
        if (status === 'suspended' && method !== 'GET') {
            throw new common_1.ForbiddenException('Your subscription is suspended. Mutating actions are blocked.');
        }
        if (status === 'cancelled') {
            throw new common_1.ForbiddenException('Your subscription has been cancelled. Access is restricted.');
        }
        return true;
    }
};
exports.SubscriptionGuard = SubscriptionGuard;
exports.SubscriptionGuard = SubscriptionGuard = __decorate([
    (0, common_1.Injectable)()
], SubscriptionGuard);
//# sourceMappingURL=subscription.guard.js.map