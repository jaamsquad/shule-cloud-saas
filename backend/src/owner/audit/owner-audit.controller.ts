import { Controller, Get, UseGuards } from '@nestjs/common';
import { OwnerAuditService } from './owner-audit.service';
import { AuthGuard } from '@nestjs/passport';
import { OwnerRoles, OwnerRolesGuard } from '../auth/owner-auth.guards';

@UseGuards(AuthGuard('owner-jwt'), OwnerRolesGuard)
@Controller('owner/audit-logs')
export class OwnerAuditController {
    constructor(private readonly auditService: OwnerAuditService) { }

    @OwnerRoles('SUPER_ADMIN')
    @Get()
    async findAll() {
        return this.auditService.findAll();
    }
}
