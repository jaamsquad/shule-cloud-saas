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
exports.GuardiansController = void 0;
const common_1 = require("@nestjs/common");
const guardians_service_1 = require("./guardians.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let GuardiansController = class GuardiansController {
    guardiansService;
    constructor(guardiansService) {
        this.guardiansService = guardiansService;
    }
    async findAll(req) {
        return this.guardiansService.findAll(req.user.tenantId);
    }
    async create(req, data) {
        const mappedData = {
            fullName: data.fullName || `${data.firstName} ${data.lastName}`,
            phone: data.phone,
            email: data.email,
        };
        return this.guardiansService.create(req.user.tenantId, mappedData);
    }
    async findOne(req, id) {
        return this.guardiansService.findOne(req.user.tenantId, id);
    }
};
exports.GuardiansController = GuardiansController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequirePermissions)('parents:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List all guardians' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GuardiansController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequirePermissions)('parents:create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new guardian' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GuardiansController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequirePermissions)('parents:view'),
    (0, swagger_1.ApiOperation)({ summary: 'Get guardian details' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GuardiansController.prototype, "findOne", null);
exports.GuardiansController = GuardiansController = __decorate([
    (0, swagger_1.ApiTags)('Guardians'),
    (0, common_1.Controller)('api/v1/guardians'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [guardians_service_1.GuardiansService])
], GuardiansController);
//# sourceMappingURL=guardians.controller.js.map