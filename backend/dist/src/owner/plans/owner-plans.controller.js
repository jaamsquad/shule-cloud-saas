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
exports.OwnerPlansController = void 0;
const common_1 = require("@nestjs/common");
const owner_plans_service_1 = require("./owner-plans.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
let OwnerPlansController = class OwnerPlansController {
    plansService;
    constructor(plansService) {
        this.plansService = plansService;
    }
    async findAll() {
        return this.plansService.findAll();
    }
    async findOne(id) {
        return this.plansService.findOne(id);
    }
    async create(dto) {
        return this.plansService.create(dto);
    }
    async update(id, dto) {
        return this.plansService.update(id, dto);
    }
    async delete(id) {
        return this.plansService.delete(id);
    }
};
exports.OwnerPlansController = OwnerPlansController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all subscription plans' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OwnerPlansController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get plan details' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OwnerPlansController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new subscription plan' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OwnerPlansController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a subscription plan' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OwnerPlansController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a subscription plan' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OwnerPlansController.prototype, "delete", null);
exports.OwnerPlansController = OwnerPlansController = __decorate([
    (0, swagger_1.ApiTags)('Owner - Plans'),
    (0, common_1.Controller)('owner/plans'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('owner-jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [owner_plans_service_1.OwnerPlansService])
], OwnerPlansController);
//# sourceMappingURL=owner-plans.controller.js.map