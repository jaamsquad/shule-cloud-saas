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
exports.LmsController = void 0;
const common_1 = require("@nestjs/common");
const lms_service_1 = require("./lms.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let LmsController = class LmsController {
    lmsService;
    constructor(lmsService) {
        this.lmsService = lmsService;
    }
    async findAll(req, query) {
        return this.lmsService.findAllCourses(req.user.tenantId, query);
    }
    async findOne(req, id) {
        return this.lmsService.findCourseDetail(req.user.tenantId, id);
    }
    async create(req, data) {
        return this.lmsService.createCourse(req.user.tenantId, data, req.user.userId);
    }
    async createAssignment(req, data) {
        return this.lmsService.createAssignment(req.user.tenantId, data);
    }
    async submitAssignment(req, data) {
        return this.lmsService.submitAssignment(req.user.tenantId, data.studentId, data);
    }
    async createQuiz(req, data) {
        return this.lmsService.createQuiz(req.user.tenantId, data);
    }
};
exports.LmsController = LmsController;
__decorate([
    (0, common_1.Get)('courses'),
    (0, permissions_guard_1.RequirePermissions)('lms:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List all courses' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LmsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('courses/:id'),
    (0, permissions_guard_1.RequirePermissions)('lms:view'),
    (0, swagger_1.ApiOperation)({ summary: 'Get course details (modules, lessons, assignments)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LmsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('courses'),
    (0, permissions_guard_1.RequirePermissions)('lms:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new course' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LmsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('assignments'),
    (0, permissions_guard_1.RequirePermissions)('lms:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Add an assignment to a course' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LmsController.prototype, "createAssignment", null);
__decorate([
    (0, common_1.Post)('submissions'),
    (0, permissions_guard_1.RequirePermissions)('lms:view'),
    (0, swagger_1.ApiOperation)({ summary: 'Submit an assignment (Student)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LmsController.prototype, "submitAssignment", null);
__decorate([
    (0, common_1.Post)('quizzes'),
    (0, permissions_guard_1.RequirePermissions)('lms:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a quiz with questions' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LmsController.prototype, "createQuiz", null);
exports.LmsController = LmsController = __decorate([
    (0, swagger_1.ApiTags)('LMS (E-Learning)'),
    (0, common_1.Controller)('api/v1/lms'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [lms_service_1.LmsService])
], LmsController);
//# sourceMappingURL=lms.controller.js.map