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
exports.OwnerSubscriptionController = void 0;
const common_1 = require("@nestjs/common");
const owner_subscriptions_service_1 = require("./owner-subscriptions.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
let OwnerSubscriptionController = class OwnerSubscriptionController {
    subService;
    constructor(subService) {
        this.subService = subService;
    }
    async assignPlan(tenantId, planId) {
        return this.subService.assignPlan(tenantId, planId);
    }
    async extendTrial(tenantId, days) {
        return this.subService.extendTrial(tenantId, days);
    }
    async getSubscription(tenantId) {
        return this.subService.getSubscription(tenantId);
    }
};
exports.OwnerSubscriptionController = OwnerSubscriptionController;
__decorate([
    (0, common_1.Post)(':tenantId/assign-plan'),
    (0, swagger_1.ApiOperation)({ summary: 'Assign a plan to a tenant' }),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Body)('planId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OwnerSubscriptionController.prototype, "assignPlan", null);
__decorate([
    (0, common_1.Post)(':tenantId/extend-trial'),
    (0, swagger_1.ApiOperation)({ summary: 'Extend trial of a tenant' }),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Body)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], OwnerSubscriptionController.prototype, "extendTrial", null);
__decorate([
    (0, common_1.Get)(':tenantId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get subscription details' }),
    __param(0, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OwnerSubscriptionController.prototype, "getSubscription", null);
exports.OwnerSubscriptionController = OwnerSubscriptionController = __decorate([
    (0, swagger_1.ApiTags)('Owner - Subscriptions'),
    (0, common_1.Controller)('owner/subscriptions'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('owner-jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [owner_subscriptions_service_1.OwnerSubscriptionService])
], OwnerSubscriptionController);
//# sourceMappingURL=owner-subscriptions.controller.js.map