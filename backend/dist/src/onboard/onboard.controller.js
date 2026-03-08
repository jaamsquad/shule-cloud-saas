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
exports.OnboardController = void 0;
const common_1 = require("@nestjs/common");
const onboard_service_1 = require("./onboard.service");
const swagger_1 = require("@nestjs/swagger");
let OnboardController = class OnboardController {
    onboardService;
    constructor(onboardService) {
        this.onboardService = onboardService;
    }
    async checkSubdomain(subdomain) {
        return this.onboardService.checkSubdomain(subdomain);
    }
    async registerTenant(data) {
        return this.onboardService.registerTenant(data);
    }
};
exports.OnboardController = OnboardController;
__decorate([
    (0, common_1.Get)('check-subdomain'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if a subdomain is available' }),
    __param(0, (0, common_1.Query)('subdomain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OnboardController.prototype, "checkSubdomain", null);
__decorate([
    (0, common_1.Post)('register-tenant'),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new school (tenant)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Tenant registered successfully' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Subdomain or email already exists' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OnboardController.prototype, "registerTenant", null);
exports.OnboardController = OnboardController = __decorate([
    (0, swagger_1.ApiTags)('Onboarding'),
    (0, common_1.Controller)('api/v1/onboard'),
    __metadata("design:paramtypes", [onboard_service_1.OnboardService])
], OnboardController);
//# sourceMappingURL=onboard.controller.js.map