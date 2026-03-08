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
exports.StaffController = void 0;
const common_1 = require("@nestjs/common");
const staff_service_1 = require("./staff.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let StaffController = class StaffController {
    staffService;
    constructor(staffService) {
        this.staffService = staffService;
    }
    async findAll(req) {
        return this.staffService.findAll(req.user.tenantId);
    }
    async findAllDepartments(req) {
        return this.staffService.findAllDepartments(req.user.tenantId);
    }
    async create(req, data) {
        return this.staffService.create(req.user.tenantId, data);
    }
    async update(req, id, data) {
        return this.staffService.update(req.user.tenantId, id, data);
    }
    async patch(req, id, data) {
        return this.staffService.update(req.user.tenantId, id, data);
    }
    async delete(req, id) {
        return this.staffService.delete(req.user.tenantId, id);
    }
    async createDepartment(req, data) {
        return this.staffService.createDepartment(req.user.tenantId, data);
    }
};
exports.StaffController = StaffController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequirePermissions)('staff:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List all staff members' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('departments'),
    (0, permissions_guard_1.RequirePermissions)('staff:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List all departments' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "findAllDepartments", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequirePermissions)('staff:create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new staff member' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_guard_1.RequirePermissions)('staff:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Update staff member' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequirePermissions)('staff:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Update staff member (Patch)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "patch", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequirePermissions)('staff:delete'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete staff member' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)('departments'),
    (0, permissions_guard_1.RequirePermissions)('staff:create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new department' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "createDepartment", null);
exports.StaffController = StaffController = __decorate([
    (0, swagger_1.ApiTags)('Staff'),
    (0, common_1.Controller)('api/v1/staff'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [staff_service_1.StaffService])
], StaffController);
//# sourceMappingURL=staff.controller.js.map