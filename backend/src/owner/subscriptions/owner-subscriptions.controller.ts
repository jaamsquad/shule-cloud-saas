import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { OwnerSubscriptionService } from './owner-subscriptions.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Owner - Subscriptions')
@Controller('owner/subscriptions')
@UseGuards(AuthGuard('owner-jwt'))
@ApiBearerAuth()
export class OwnerSubscriptionController {
    constructor(private readonly subService: OwnerSubscriptionService) { }

    @Post(':tenantId/assign-plan')
    @ApiOperation({ summary: 'Assign a plan to a tenant' })
    async assignPlan(@Param('tenantId') tenantId: string, @Body('planId') planId: string) {
        return this.subService.assignPlan(tenantId, planId);
    }

    @Post(':tenantId/extend-trial')
    @ApiOperation({ summary: 'Extend trial of a tenant' })
    async extendTrial(@Param('tenantId') tenantId: string, @Body('days') days: number) {
        return this.subService.extendTrial(tenantId, days);
    }

    @Get(':tenantId')
    @ApiOperation({ summary: 'Get subscription details' })
    async getSubscription(@Param('tenantId') tenantId: string) {
        return this.subService.getSubscription(tenantId);
    }
}
