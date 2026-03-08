import { Controller, Post, Body, Get, UseGuards, Request, Delete, Query, Param, Put } from '@nestjs/common';
import { AcademicsService } from './academics.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('Academics (Classes & Subjects)')
@Controller('api/v1/academics')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class AcademicsController {
    constructor(private readonly academicsService: AcademicsService) { }

    @Get('classes')
    @RequirePermissions('classes:view')
    @ApiOperation({ summary: 'List all classes/streams' })
    async findAllClasses(@Request() req) {
        return this.academicsService.findAllClasses(req.user.tenantId);
    }

    @Get('classes/:id')
    @RequirePermissions('classes:view')
    @ApiOperation({ summary: 'Get class stream details' })
    async findOneClass(@Request() req, @Param('id') id: string) {
        return this.academicsService.findOneClass(req.user.tenantId, id);
    }

    @Post('classes')
    @RequirePermissions('classes:create')
    @ApiOperation({ summary: 'Create a new class stream' })
    async createClass(@Request() req, @Body() data: any) {
        return this.academicsService.createClass(req.user.tenantId, data);
    }

    @Put('classes/:id')
    @RequirePermissions('classes:edit')
    @ApiOperation({ summary: 'Update class stream' })
    async updateClass(@Request() req, @Param('id') id: string, @Body() data: any) {
        return this.academicsService.updateClass(req.user.tenantId, id, data);
    }

    @Delete('classes/:id')
    @RequirePermissions('classes:delete')
    @ApiOperation({ summary: 'Delete class stream' })
    async deleteClass(@Request() req, @Param('id') id: string) {
        return this.academicsService.deleteClass(req.user.tenantId, id);
    }

    @Get('subjects')
    @RequirePermissions('classes:view')
    @ApiOperation({ summary: 'List all subjects / learning areas' })
    async findAllSubjects(@Request() req) {
        return this.academicsService.findAllSubjects(req.user.tenantId);
    }

    @Post('subjects')
    @RequirePermissions('classes:create')
    @ApiOperation({ summary: 'Create a new subject' })
    async createSubject(@Request() req, @Body() data: any) {
        return this.academicsService.createSubject(req.user.tenantId, data);
    }

    @Delete('subjects/:id')
    @RequirePermissions('classes:delete')
    @ApiOperation({ summary: 'Delete subject' })
    async deleteSubject(@Request() req, @Param('id') id: string) {
        return this.academicsService.deleteSubject(req.user.tenantId, id);
    }

    @Get('cbc/strands')
    @RequirePermissions('classes:view')
    @ApiOperation({ summary: 'List CBC strands' })
    async findAllStrands(@Request() req, @Query('subjectId') subjectId: string) {
        return this.academicsService.findAllStrands(req.user.tenantId, subjectId);
    }

    @Post('cbc/strands')
    @RequirePermissions('classes:create')
    @ApiOperation({ summary: 'Create a CBC strand' })
    async createStrand(@Request() req, @Body() data: any) {
        return this.academicsService.createStrand(req.user.tenantId, data);
    }

    @Post('cbc/sub-strands')
    @RequirePermissions('classes:create')
    @ApiOperation({ summary: 'Create a CBC sub-strand' })
    async createSubStrand(@Request() req, @Body() data: any) {
        return this.academicsService.createSubStrand(req.user.tenantId, data);
    }
}
