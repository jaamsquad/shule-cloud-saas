import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { OnboardService } from './onboard.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Onboarding')
@Controller('api/v1/onboard')
export class OnboardController {
    constructor(private readonly onboardService: OnboardService) { }

    @Get('check-subdomain')
    @ApiOperation({ summary: 'Check if a subdomain is available' })
    async checkSubdomain(@Query('subdomain') subdomain: string) {
        return this.onboardService.checkSubdomain(subdomain);
    }

    @Post('register-tenant')
    @ApiOperation({ summary: 'Register a new school (tenant)' })
    @ApiResponse({ status: 201, description: 'Tenant registered successfully' })
    @ApiResponse({ status: 409, description: 'Subdomain or email already exists' })
    async registerTenant(@Body() data: any) {
        return this.onboardService.registerTenant(data);
    }
}
