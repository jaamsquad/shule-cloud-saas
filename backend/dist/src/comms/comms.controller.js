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
exports.CommsController = void 0;
const common_1 = require("@nestjs/common");
const comms_service_1 = require("./comms.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let CommsController = class CommsController {
    commsService;
    constructor(commsService) {
        this.commsService = commsService;
    }
    async findAllAnnouncements(req) {
        return this.commsService.findAllAnnouncements(req.user.tenantId);
    }
    async createAnnouncement(req, data) {
        return this.commsService.createAnnouncement(req.user.tenantId, data, req.user.userId);
    }
    async findAllMessages(req) {
        return this.commsService.findAllMessages(req.user.tenantId, req.user.userId);
    }
    async sendMessage(req, data) {
        return this.commsService.sendMessage(req.user.tenantId, req.user.userId, data);
    }
};
exports.CommsController = CommsController;
__decorate([
    (0, common_1.Get)('announcements'),
    (0, permissions_guard_1.RequirePermissions)('comms:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List all announcements' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommsController.prototype, "findAllAnnouncements", null);
__decorate([
    (0, common_1.Post)('announcements'),
    (0, permissions_guard_1.RequirePermissions)('comms:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Create an announcement' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CommsController.prototype, "createAnnouncement", null);
__decorate([
    (0, common_1.Get)('messages'),
    (0, permissions_guard_1.RequirePermissions)('comms:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List messages for current user' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommsController.prototype, "findAllMessages", null);
__decorate([
    (0, common_1.Post)('messages'),
    (0, permissions_guard_1.RequirePermissions)('comms:view'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a message' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CommsController.prototype, "sendMessage", null);
exports.CommsController = CommsController = __decorate([
    (0, swagger_1.ApiTags)('Communications'),
    (0, common_1.Controller)('api/v1/comms'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [comms_service_1.CommsService])
], CommsController);
//# sourceMappingURL=comms.controller.js.map