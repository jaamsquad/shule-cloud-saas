import { Controller, Post, Body, Get, UseGuards, Request, Delete, Query, Put, Param, Patch } from '@nestjs/common';
import { StaffService } from './staff.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('Staff')
@Controller('api/v1/staff')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @Get()
    @RequirePermissions('staff:view')
    @ApiOperation({ summary: 'List all staff members' })
    async findAll(@Request() req: any) {
        return this.staffService.findAll(req.user.tenantId);
    }

    @Get('departments')
    @RequirePermissions('staff:view')
    @ApiOperation({ summary: 'List all departments' })
    async findAllDepartments(@Request() req: any) {
        return this.staffService.findAllDepartments(req.user.tenantId);
    }

    @Post()
    @RequirePermissions('staff:create')
    @ApiOperation({ summary: 'Create a new staff member' })
    async create(@Request() req: any, @Body() data: any) {
        return this.staffService.create(req.user.tenantId, data);
    }

    @Put(':id')
    @RequirePermissions('staff:edit')
    @ApiOperation({ summary: 'Update staff member' })
    async update(@Request() req: any, @Param('id') id: string, @Body() data: any) {
        return this.staffService.update(req.user.tenantId, id, data);
    }

    @Patch(':id')
    @RequirePermissions('staff:edit')
    @ApiOperation({ summary: 'Update staff member (Patch)' })
    async patch(@Request() req: any, @Param('id') id: string, @Body() data: any) {
        return this.staffService.update(req.user.tenantId, id, data);
    }

    @Delete(':id')
    @RequirePermissions('staff:delete')
    @ApiOperation({ summary: 'Delete staff member' })
    async delete(@Request() req: any, @Param('id') id: string) {
        return this.staffService.delete(req.user.tenantId, id);
    }

    @Post('departments')
    @RequirePermissions('staff:create')
    @ApiOperation({ summary: 'Create a new department' })
    async createDepartment(@Request() req: any, @Body() data: { name: string }) {
        return this.staffService.createDepartment(req.user.tenantId, data);
    }
}
