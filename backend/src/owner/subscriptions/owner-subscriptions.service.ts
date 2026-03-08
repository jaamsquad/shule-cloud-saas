import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OwnerSubscriptionService {
    constructor(private prisma: PrismaService) { }

    async assignPlan(tenantId: string, planId: string) {
        const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) throw new NotFoundException('Plan not found');

        const subscription = await this.prisma.tenantSubscription.upsert({
            where: { tenantId },
            update: {
                planId,
                status: 'active',
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
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

    async extendTrial(tenantId: string, days: number) {
        const sub = await this.prisma.tenantSubscription.findUnique({ where: { tenantId } });
        if (!sub) throw new NotFoundException('Subscription not found');

        const newTrialEnd = new Date((sub.trialEnd || new Date()).getTime() + days * 24 * 60 * 60 * 1000);

        return this.prisma.tenantSubscription.update({
            where: { tenantId },
            data: { trialEnd: newTrialEnd, status: 'trial' }
        });
    }

    async getSubscription(tenantId: string) {
        return this.prisma.tenantSubscription.findUnique({
            where: { tenantId },
            include: { plan: true }
        });
    }
}
