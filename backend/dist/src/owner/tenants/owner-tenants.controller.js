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
exports.OwnerTenantsController = void 0;
const common_1 = require("@nestjs/common");
const owner_tenants_service_1 = require("./owner-tenants.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
let OwnerTenantsController = class OwnerTenantsController {
    tenantsService;
    constructor(tenantsService) {
        this.tenantsService = tenantsService;
    }
    async findAll() {
        return this.tenantsService.findAll();
    }
    async findOne(id) {
        return this.tenantsService.findOne(id);
    }
    async create(dto) {
        return this.tenantsService.create(dto);
    }
    async update(id, dto) {
        return this.tenantsService.update(id, dto);
    }
    async suspend(id) {
        return this.tenantsService.setStatus(id, 'suspended');
    }
    async activate(id) {
        return this.tenantsService.setStatus(id, 'active');
    }
    async cancel(id) {
        return this.tenantsService.setStatus(id, 'cancelled');
    }
};
exports.OwnerTenantsController = OwnerTenantsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all tenants' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OwnerTenantsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get tenant details' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OwnerTenantsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new tenant manually' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OwnerTenantsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update tenant metadata' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OwnerTenantsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/suspend'),
    (0, swagger_1.ApiOperation)({ summary: 'Suspend a tenant' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OwnerTenantsController.prototype, "suspend", null);
__decorate([
    (0, common_1.Post)(':id/activate'),
    (0, swagger_1.ApiOperation)({ summary: 'Activate a tenant' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OwnerTenantsController.prototype, "activate", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel a tenant' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OwnerTenantsController.prototype, "cancel", null);
exports.OwnerTenantsController = OwnerTenantsController = __decorate([
    (0, swagger_1.ApiTags)('Owner - Tenants'),
    (0, common_1.Controller)('owner/tenants'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('owner-jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [owner_tenants_service_1.OwnerTenantsService])
], OwnerTenantsController);
//# sourceMappingURL=owner-tenants.controller.js.map