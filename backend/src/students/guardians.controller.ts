import { Controller, Post, Body, Get, UseGuards, Request, Param } from '@nestjs/common';
import { GuardiansService } from './guardians.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('Guardians')
@Controller('api/v1/guardians')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class GuardiansController {
    constructor(private readonly guardiansService: GuardiansService) { }

    @Get()
    @RequirePermissions('parents:view')
    @ApiOperation({ summary: 'List all guardians' })
    async findAll(@Request() req: any) {
        return this.guardiansService.findAll(req.user.tenantId);
    }

    @Post()
    @RequirePermissions('parents:create')
    @ApiOperation({ summary: 'Create a new guardian' })
    async create(@Request() req: any, @Body() data: any) {
        // Map from frontend field names if necessary
        const mappedData = {
            fullName: data.fullName || `${data.firstName} ${data.lastName}`,
            phone: data.phone,
            email: data.email,
        };
        return this.guardiansService.create(req.user.tenantId, mappedData);
    }

    @Get(':id')
    @RequirePermissions('parents:view')
    @ApiOperation({ summary: 'Get guardian details' })
    async findOne(@Request() req: any, @Param('id') id: string) {
        return this.guardiansService.findOne(req.user.tenantId, id);
    }
}
