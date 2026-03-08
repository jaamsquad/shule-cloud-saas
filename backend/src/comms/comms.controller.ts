import { Controller, Post, Body, Get, UseGuards, Request, Delete, Query, Param, Patch } from '@nestjs/common';
import { CommsService } from './comms.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('Communications')
@Controller('api/v1/comms')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class CommsController {
    constructor(private readonly commsService: CommsService) { }

    @Get('announcements')
    @RequirePermissions('comms:view')
    @ApiOperation({ summary: 'List all announcements' })
    async findAllAnnouncements(@Request() req) {
        return this.commsService.findAllAnnouncements(req.user.tenantId);
    }

    @Post('announcements')
    @RequirePermissions('comms:edit')
    @ApiOperation({ summary: 'Create an announcement' })
    async createAnnouncement(@Request() req, @Body() data: any) {
        return this.commsService.createAnnouncement(req.user.tenantId, data, req.user.userId);
    }

    @Get('messages')
    @RequirePermissions('comms:view')
    @ApiOperation({ summary: 'List messages for current user' })
    async findAllMessages(@Request() req) {
        return this.commsService.findAllMessages(req.user.tenantId, req.user.userId);
    }

    @Post('messages')
    @RequirePermissions('comms:view')
    @ApiOperation({ summary: 'Send a message' })
    async sendMessage(@Request() req, @Body() data: any) {
        return this.commsService.sendMessage(req.user.tenantId, req.user.userId, data);
    }
}
