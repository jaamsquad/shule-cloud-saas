import { Controller, Post, Body, Get, UseGuards, Request, Delete, Query, Param } from '@nestjs/common';
import { BasicModulesService } from './basic-modules.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('Basic Modules (Library, Transport, Inventory)')
@Controller('api/v1/modules')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class BasicModulesController {
    constructor(private readonly modulesService: BasicModulesService) { }

    @Get('library/books')
    @RequirePermissions('library:view')
    @ApiOperation({ summary: 'List library books' })
    async findAllBooks(@Request() req) {
        return this.modulesService.findAllBooks(req.user.tenantId);
    }

    @Post('library/books')
    @RequirePermissions('library:edit')
    @ApiOperation({ summary: 'Add a book' })
    async createBook(@Request() req, @Body() data: any) {
        return this.modulesService.createBook(req.user.tenantId, data);
    }

    @Get('transport/routes')
    @RequirePermissions('transport:view')
    @ApiOperation({ summary: 'List transport routes' })
    async findAllTransport(@Request() req) {
        return this.modulesService.findAllTransport(req.user.tenantId);
    }

    @Post('transport/routes')
    @RequirePermissions('transport:edit')
    @ApiOperation({ summary: 'Add transport route' })
    async createTransport(@Request() req, @Body() data: any) {
        return this.modulesService.createTransport(req.user.tenantId, data);
    }

    @Get('inventory/items')
    @RequirePermissions('inventory:view')
    @ApiOperation({ summary: 'List inventory items' })
    async findAllInventory(@Request() req) {
        return this.modulesService.findAllInventory(req.user.tenantId);
    }

    @Post('inventory/items')
    @RequirePermissions('inventory:edit')
    @ApiOperation({ summary: 'Add inventory item' })
    async createInventory(@Request() req, @Body() data: any) {
        return this.modulesService.createInventory(req.user.tenantId, data);
    }
}
