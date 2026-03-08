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
exports.OwnerAuthController = void 0;
const common_1 = require("@nestjs/common");
const owner_auth_service_1 = require("./owner-auth.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
let OwnerAuthController = class OwnerAuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async register(dto) {
        return this.authService.register(dto);
    }
    async login(dto) {
        return this.authService.login(dto);
    }
    async getMe(req) {
        return this.authService.getMe(req.user.sub);
    }
    async changePassword(req, dto) {
        return this.authService.changePassword(req.user.sub, dto);
    }
};
exports.OwnerAuthController = OwnerAuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'Register the first platform admin (development only)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OwnerAuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOperation)({ summary: 'Login to owner portal' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OwnerAuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('owner-jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current owner admin profile' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OwnerAuthController.prototype, "getMe", null);
__decorate([
    (0, common_1.Post)('password'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('owner-jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Change owner password' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OwnerAuthController.prototype, "changePassword", null);
exports.OwnerAuthController = OwnerAuthController = __decorate([
    (0, swagger_1.ApiTags)('Owner - Authentication'),
    (0, common_1.Controller)('api/v1/owner/auth'),
    __metadata("design:paramtypes", [owner_auth_service_1.OwnerAuthService])
], OwnerAuthController);
//# sourceMappingURL=owner-auth.controller.js.map