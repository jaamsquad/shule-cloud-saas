"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const common_1 = require("@nestjs/common");
const attendance_service_1 = require("./attendance.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let AttendanceController = class AttendanceController {
    attendanceService;
    constructor(attendanceService) {
        this.attendanceService = attendanceService;
    }
    async markStudent(req, data) {
        return this.attendanceService.markStudentAttendance(req.user.tenantId, data, req.user.userId);
    }
    async getStudentReport(req, query) {
        return this.attendanceService.getStudentReport(req.user.tenantId, query);
    }
    async markStaff(req, data) {
        return this.attendanceService.markStaffAttendance(req.user.tenantId, data, req.user.userId);
    }
    async getStaffReport(req, query) {
        return this.attendanceService.getStaffReport(req.user.tenantId, query);
    }
};
exports.AttendanceController = AttendanceController;
__decorate([
    (0, common_1.Post)('students/mark'),
    (0, permissions_guard_1.RequirePermissions)('attendance:mark'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark student attendance' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "markStudent", null);
__decorate([
    (0, common_1.Get)('students/report'),
    (0, permissions_guard_1.RequirePermissions)('attendance:report'),
    (0, swagger_1.ApiOperation)({ summary: 'Get student attendance report' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getStudentReport", null);
__decorate([
    (0, common_1.Post)('staff/mark'),
    (0, permissions_guard_1.RequirePermissions)('attendance:mark'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark staff attendance' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "markStaff", null);
__decorate([
    (0, common_1.Get)('staff/report'),
    (0, permissions_guard_1.RequirePermissions)('attendance:report'),
    (0, swagger_1.ApiOperation)({ summary: 'Get staff attendance report' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getStaffReport", null);
exports.AttendanceController = AttendanceController = __decorate([
    (0, swagger_1.ApiTags)('Attendance'),
    (0, common_1.Controller)('api/v1/attendance'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService])
], AttendanceController);
//# sourceMappingURL=attendance.controller.js.map