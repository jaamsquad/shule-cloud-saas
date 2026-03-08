import { Controller, Post, Body, Get, UseGuards, Request, Delete, Query, Put, Param } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('RBAC (Roles & Permissions)')
@Controller('api/v1/rbac')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class RbacController {
    constructor(private readonly rbacService: RbacService) { }

    @Get('permissions')
    @ApiOperation({ summary: 'Get all possible permissions (global list)' })
    async getPermissions() {
        return this.rbacService.getPermissions();
    }

    @Get('roles')
    @RequirePermissions('settings:view')
    @ApiOperation({ summary: 'Get all roles for current tenant' })
    async getRoles(@Request() req) {
        return this.rbacService.getRoles(req.user.tenantId);
    }

    @Post('roles')
    @RequirePermissions('settings:edit')
    @ApiOperation({ summary: 'Create a new role' })
    async createRole(@Request() req, @Body() data: any) {
        return this.rbacService.createRole(req.user.tenantId, data);
    }

    @Put('roles/:id/permissions')
    @RequirePermissions('settings:edit')
    @ApiOperation({ summary: 'Update permissions for a role' })
    async updateRolePermissions(@Request() req, @Param('id') roleId: string, @Body() data: { permissions: string[] }) {
        return this.rbacService.updateRolePermissions(req.user.tenantId, roleId, data.permissions);
    }

    @Delete('roles/:id')
    @RequirePermissions('settings:edit')
    @ApiOperation({ summary: 'Delete a role' })
    async deleteRole(@Request() req, @Param('id') roleId: string) {
        return this.rbacService.deleteRole(req.user.tenantId, roleId);
    }

    @Post('user-roles')
    @RequirePermissions('settings:edit')
    @ApiOperation({ summary: 'Assign a role to a user' })
    async assignUserRole(@Request() req, @Body() data: any) {
        const { userId, roleId } = data;
        return this.rbacService.assignUserRole(req.user.tenantId, userId, roleId);
    }

    @Delete('user-roles')
    @RequirePermissions('settings:edit')
    @ApiOperation({ summary: 'Remove a role from a user' })
    async removeUserRole(@Request() req, @Query('userId') userId: string, @Query('roleId') roleId: string) {
        return this.rbacService.removeUserRole(req.user.tenantId, userId, roleId);
    }
}
