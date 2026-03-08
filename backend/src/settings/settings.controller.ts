import { Controller, Post, Body, Get, UseGuards, Request, Patch, Param } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('School Settings')
@Controller('api/v1/settings')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get('school')
    @RequirePermissions('settings:view')
    @ApiOperation({ summary: 'Get school profile and configurations' })
    async getSchool(@Request() req) {
        return this.settingsService.getSchoolSettings(req.user.tenantId);
    }

    @Post('school')
    @RequirePermissions('settings:edit')
    @ApiOperation({ summary: 'Update school profile and configurations' })
    async updateSchool(@Request() req, @Body() data: any) {
        return this.settingsService.updateSchoolSettings(req.user.tenantId, data);
    }

    @Get('academic-years')
    @RequirePermissions('settings:view')
    @ApiOperation({ summary: 'List all academic years' })
    async findAllAY(@Request() req) {
        return this.settingsService.findAllAcademicYears(req.user.tenantId);
    }

    @Post('academic-years')
    @RequirePermissions('settings:edit')
    @ApiOperation({ summary: 'Create academic year with terms' })
    async createAY(@Request() req, @Body() data: any) {
        return this.settingsService.createAcademicYear(req.user.tenantId, data);
    }

    @Patch('terms/:id/current')
    @RequirePermissions('settings:edit')
    @ApiOperation({ summary: 'Set a term as current' })
    async setTermCurrent(@Request() req, @Param('id') id: string) {
        return this.settingsService.setTermCurrent(req.user.tenantId, id);
    }
}
