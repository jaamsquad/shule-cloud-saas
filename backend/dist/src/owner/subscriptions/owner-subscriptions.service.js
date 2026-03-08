"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OwnerSubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let OwnerSubscriptionService = class OwnerSubscriptionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assignPlan(tenantId, planId) {
        const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
        if (!plan)
            throw new common_1.NotFoundException('Plan not found');
        const subscription = await this.prisma.tenantSubscription.upsert({
            where: { tenantId },
            update: {
                planId,
                status: 'active',
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
            create: {
                tenantId,
                planId,
                status: 'active',
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }
        });
        return subscription;
    }
    async extendTrial(tenantId, days) {
        const sub = await this.prisma.tenantSubscription.findUnique({ where: { tenantId } });
        if (!sub)
            throw new common_1.NotFoundException('Subscription not found');
        const newTrialEnd = new Date((sub.trialEnd || new Date()).getTime() + days * 24 * 60 * 60 * 1000);
        return this.prisma.tenantSubscription.update({
            where: { tenantId },
            data: { trialEnd: newTrialEnd, status: 'trial' }
        });
    }
    async getSubscription(tenantId) {
        return this.prisma.tenantSubscription.findUnique({
            where: { tenantId },
            include: { plan: true }
        });
    }
};
exports.OwnerSubscriptionService = OwnerSubscriptionService;
exports.OwnerSubscriptionService = OwnerSubscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OwnerSubscriptionService);
//# sourceMappingURL=owner-subscriptions.service.js.map