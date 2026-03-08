import { Controller, Post, Body, Get, UseGuards, Request, Delete, Query, Param, Patch } from '@nestjs/common';
import { LmsService } from './lms.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('LMS (E-Learning)')
@Controller('api/v1/lms')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class LmsController {
    constructor(private readonly lmsService: LmsService) { }

    @Get('courses')
    @RequirePermissions('lms:view')
    @ApiOperation({ summary: 'List all courses' })
    async findAll(@Request() req, @Query() query: any) {
        return this.lmsService.findAllCourses(req.user.tenantId, query);
    }

    @Get('courses/:id')
    @RequirePermissions('lms:view')
    @ApiOperation({ summary: 'Get course details (modules, lessons, assignments)' })
    async findOne(@Request() req, @Param('id') id: string) {
        return this.lmsService.findCourseDetail(req.user.tenantId, id);
    }

    @Post('courses')
    @RequirePermissions('lms:edit')
    @ApiOperation({ summary: 'Create a new course' })
    async create(@Request() req, @Body() data: any) {
        return this.lmsService.createCourse(req.user.tenantId, data, req.user.userId);
    }

    @Post('assignments')
    @RequirePermissions('lms:edit')
    @ApiOperation({ summary: 'Add an assignment to a course' })
    async createAssignment(@Request() req, @Body() data: any) {
        return this.lmsService.createAssignment(req.user.tenantId, data);
    }

    @Post('submissions')
    @RequirePermissions('lms:view')
    @ApiOperation({ summary: 'Submit an assignment (Student)' })
    async submitAssignment(@Request() req, @Body() data: any) {
        // Assume studentId is linked to user or passed in data
        return this.lmsService.submitAssignment(req.user.tenantId, data.studentId, data);
    }

    @Post('quizzes')
    @RequirePermissions('lms:edit')
    @ApiOperation({ summary: 'Create a quiz with questions' })
    async createQuiz(@Request() req, @Body() data: any) {
        return this.lmsService.createQuiz(req.user.tenantId, data);
    }
}
