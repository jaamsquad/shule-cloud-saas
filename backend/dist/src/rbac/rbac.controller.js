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
exports.RbacController = void 0;
const common_1 = require("@nestjs/common");
const rbac_service_1 = require("./rbac.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let RbacController = class RbacController {
    rbacService;
    constructor(rbacService) {
        this.rbacService = rbacService;
    }
    async getPermissions() {
        return this.rbacService.getPermissions();
    }
    async getRoles(req) {
        return this.rbacService.getRoles(req.user.tenantId);
    }
    async createRole(req, data) {
        return this.rbacService.createRole(req.user.tenantId, data);
    }
    async updateRolePermissions(req, roleId, data) {
        return this.rbacService.updateRolePermissions(req.user.tenantId, roleId, data.permissions);
    }
    async deleteRole(req, roleId) {
        return this.rbacService.deleteRole(req.user.tenantId, roleId);
    }
    async assignUserRole(req, data) {
        const { userId, roleId } = data;
        return this.rbacService.assignUserRole(req.user.tenantId, userId, roleId);
    }
    async removeUserRole(req, userId, roleId) {
        return this.rbacService.removeUserRole(req.user.tenantId, userId, roleId);
    }
};
exports.RbacController = RbacController;
__decorate([
    (0, common_1.Get)('permissions'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all possible permissions (global list)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RbacController.prototype, "getPermissions", null);
__decorate([
    (0, common_1.Get)('roles'),
    (0, permissions_guard_1.RequirePermissions)('settings:view'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all roles for current tenant' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RbacController.prototype, "getRoles", null);
__decorate([
    (0, common_1.Post)('roles'),
    (0, permissions_guard_1.RequirePermissions)('settings:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new role' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RbacController.prototype, "createRole", null);
__decorate([
    (0, common_1.Put)('roles/:id/permissions'),
    (0, permissions_guard_1.RequirePermissions)('settings:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Update permissions for a role' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RbacController.prototype, "updateRolePermissions", null);
__decorate([
    (0, common_1.Delete)('roles/:id'),
    (0, permissions_guard_1.RequirePermissions)('settings:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a role' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RbacController.prototype, "deleteRole", null);
__decorate([
    (0, common_1.Post)('user-roles'),
    (0, permissions_guard_1.RequirePermissions)('settings:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Assign a role to a user' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RbacController.prototype, "assignUserRole", null);
__decorate([
    (0, common_1.Delete)('user-roles'),
    (0, permissions_guard_1.RequirePermissions)('settings:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a role from a user' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('userId')),
    __param(2, (0, common_1.Query)('roleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RbacController.prototype, "removeUserRole", null);
exports.RbacController = RbacController = __decorate([
    (0, swagger_1.ApiTags)('RBAC (Roles & Permissions)'),
    (0, common_1.Controller)('api/v1/rbac'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [rbac_service_1.RbacService])
], RbacController);
//# sourceMappingURL=rbac.controller.js.map