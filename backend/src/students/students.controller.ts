import { Controller, Post, Body, Get, UseGuards, Request, Delete, Query, Put, Param } from '@nestjs/common';
import { StudentsService } from './students.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('Students')
@Controller('api/v1/students')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class StudentsController {
    constructor(private readonly studentsService: StudentsService) { }

    @Get()
    @RequirePermissions('students:view')
    @ApiOperation({ summary: 'List all students' })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'classId', required: false })
    async findAll(@Request() req: any, @Query() query: any) {
        return this.studentsService.findAll(req.user.tenantId, query);
    }

    @Get(':id')
    @RequirePermissions('students:view')
    @ApiOperation({ summary: 'Get student details' })
    async findOne(@Request() req: any, @Param('id') id: string) {
        return this.studentsService.findOne(req.user.tenantId, id);
    }

    @Post()
    @RequirePermissions('students:create')
    @ApiOperation({ summary: 'Create a new student' })
    async create(@Request() req: any, @Body() data: any) {
        return this.studentsService.create(req.user.tenantId, data);
    }

    @Put(':id')
    @RequirePermissions('students:edit')
    @ApiOperation({ summary: 'Update student' })
    async update(@Request() req: any, @Param('id') id: string, @Body() data: any) {
        return this.studentsService.update(req.user.tenantId, id, data);
    }

    @Delete(':id')
    @RequirePermissions('students:delete')
    @ApiOperation({ summary: 'Delete student' })
    async delete(@Request() req: any, @Param('id') id: string) {
        return this.studentsService.delete(req.user.tenantId, id);
    }

    @Post('bulk-import')
    @RequirePermissions('students:create')
    @ApiOperation({ summary: 'Bulk import students' })
    async bulkImport(@Request() req: any, @Body() data: { students: any[] }) {
        return this.studentsService.bulkImport(req.user.tenantId, data.students);
    }
}
