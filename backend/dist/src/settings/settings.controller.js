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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const settings_service_1 = require("./settings.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let SettingsController = class SettingsController {
    settingsService;
    constructor(settingsService) {
        this.settingsService = settingsService;
    }
    async getSchool(req) {
        return this.settingsService.getSchoolSettings(req.user.tenantId);
    }
    async updateSchool(req, data) {
        return this.settingsService.updateSchoolSettings(req.user.tenantId, data);
    }
    async findAllAY(req) {
        return this.settingsService.findAllAcademicYears(req.user.tenantId);
    }
    async createAY(req, data) {
        return this.settingsService.createAcademicYear(req.user.tenantId, data);
    }
    async setTermCurrent(req, id) {
        return this.settingsService.setTermCurrent(req.user.tenantId, id);
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)('school'),
    (0, permissions_guard_1.RequirePermissions)('settings:view'),
    (0, swagger_1.ApiOperation)({ summary: 'Get school profile and configurations' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getSchool", null);
__decorate([
    (0, common_1.Post)('school'),
    (0, permissions_guard_1.RequirePermissions)('settings:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Update school profile and configurations' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateSchool", null);
__decorate([
    (0, common_1.Get)('academic-years'),
    (0, permissions_guard_1.RequirePermissions)('settings:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List all academic years' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "findAllAY", null);
__decorate([
    (0, common_1.Post)('academic-years'),
    (0, permissions_guard_1.RequirePermissions)('settings:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Create academic year with terms' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "createAY", null);
__decorate([
    (0, common_1.Patch)('terms/:id/current'),
    (0, permissions_guard_1.RequirePermissions)('settings:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Set a term as current' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "setTermCurrent", null);
exports.SettingsController = SettingsController = __decorate([
    (0, swagger_1.ApiTags)('School Settings'),
    (0, common_1.Controller)('api/v1/settings'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map