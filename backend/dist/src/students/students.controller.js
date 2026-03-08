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
exports.StudentsController = void 0;
const common_1 = require("@nestjs/common");
const students_service_1 = require("./students.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let StudentsController = class StudentsController {
    studentsService;
    constructor(studentsService) {
        this.studentsService = studentsService;
    }
    async findAll(req, query) {
        return this.studentsService.findAll(req.user.tenantId, query);
    }
    async findOne(req, id) {
        return this.studentsService.findOne(req.user.tenantId, id);
    }
    async create(req, data) {
        return this.studentsService.create(req.user.tenantId, data);
    }
    async update(req, id, data) {
        return this.studentsService.update(req.user.tenantId, id, data);
    }
    async delete(req, id) {
        return this.studentsService.delete(req.user.tenantId, id);
    }
    async bulkImport(req, data) {
        return this.studentsService.bulkImport(req.user.tenantId, data.students);
    }
};
exports.StudentsController = StudentsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequirePermissions)('students:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List all students' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'classId', required: false }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequirePermissions)('students:view'),
    (0, swagger_1.ApiOperation)({ summary: 'Get student details' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequirePermissions)('students:create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new student' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_guard_1.RequirePermissions)('students:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Update student' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequirePermissions)('students:delete'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete student' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)('bulk-import'),
    (0, permissions_guard_1.RequirePermissions)('students:create'),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk import students' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "bulkImport", null);
exports.StudentsController = StudentsController = __decorate([
    (0, swagger_1.ApiTags)('Students'),
    (0, common_1.Controller)('api/v1/students'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [students_service_1.StudentsService])
], StudentsController);
//# sourceMappingURL=students.controller.js.map