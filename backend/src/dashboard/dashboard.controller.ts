import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('Dashboard')
@Controller('api/v1/dashboard')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('stats')
    @RequirePermissions('dashboard:view')
    @ApiOperation({ summary: 'Get overview statistics for the school' })
    async getStats(@Request() req) {
        return this.dashboardService.getStats(req.user.tenantId);
    }
}
