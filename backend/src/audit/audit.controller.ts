import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('Audit & Compliance')
@Controller('api/v1/audit')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get('logs')
    @RequirePermissions('audit:view')
    @ApiOperation({ summary: 'View all administrative logs for current tenant' })
    async findAllLogs(@Request() req, @Query() query: any) {
        return this.auditService.findAllLogs(req.user.tenantId, query);
    }
}
