import { Controller, Post, Body, Get, UseGuards, Request, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('Attendance')
@Controller('api/v1/attendance')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    @Post('students/mark')
    @RequirePermissions('attendance:mark')
    @ApiOperation({ summary: 'Mark student attendance' })
    async markStudent(@Request() req, @Body() data: any) {
        return this.attendanceService.markStudentAttendance(req.user.tenantId, data, req.user.userId);
    }

    @Get('students/report')
    @RequirePermissions('attendance:report')
    @ApiOperation({ summary: 'Get student attendance report' })
    async getStudentReport(@Request() req, @Query() query: any) {
        return this.attendanceService.getStudentReport(req.user.tenantId, query);
    }

    @Post('staff/mark')
    @RequirePermissions('attendance:mark')
    @ApiOperation({ summary: 'Mark staff attendance' })
    async markStaff(@Request() req, @Body() data: any) {
        return this.attendanceService.markStaffAttendance(req.user.tenantId, data, req.user.userId);
    }

    @Get('staff/report')
    @RequirePermissions('attendance:report')
    @ApiOperation({ summary: 'Get staff attendance report' })
    async getStaffReport(@Request() req, @Query() query: any) {
        return this.attendanceService.getStaffReport(req.user.tenantId, query);
    }
}
