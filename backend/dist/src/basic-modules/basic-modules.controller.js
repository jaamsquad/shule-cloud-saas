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
exports.BasicModulesController = void 0;
const common_1 = require("@nestjs/common");
const basic_modules_service_1 = require("./basic-modules.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let BasicModulesController = class BasicModulesController {
    modulesService;
    constructor(modulesService) {
        this.modulesService = modulesService;
    }
    async findAllBooks(req) {
        return this.modulesService.findAllBooks(req.user.tenantId);
    }
    async createBook(req, data) {
        return this.modulesService.createBook(req.user.tenantId, data);
    }
    async findAllTransport(req) {
        return this.modulesService.findAllTransport(req.user.tenantId);
    }
    async createTransport(req, data) {
        return this.modulesService.createTransport(req.user.tenantId, data);
    }
    async findAllInventory(req) {
        return this.modulesService.findAllInventory(req.user.tenantId);
    }
    async createInventory(req, data) {
        return this.modulesService.createInventory(req.user.tenantId, data);
    }
};
exports.BasicModulesController = BasicModulesController;
__decorate([
    (0, common_1.Get)('library/books'),
    (0, permissions_guard_1.RequirePermissions)('library:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List library books' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BasicModulesController.prototype, "findAllBooks", null);
__decorate([
    (0, common_1.Post)('library/books'),
    (0, permissions_guard_1.RequirePermissions)('library:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a book' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BasicModulesController.prototype, "createBook", null);
__decorate([
    (0, common_1.Get)('transport/routes'),
    (0, permissions_guard_1.RequirePermissions)('transport:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List transport routes' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BasicModulesController.prototype, "findAllTransport", null);
__decorate([
    (0, common_1.Post)('transport/routes'),
    (0, permissions_guard_1.RequirePermissions)('transport:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Add transport route' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BasicModulesController.prototype, "createTransport", null);
__decorate([
    (0, common_1.Get)('inventory/items'),
    (0, permissions_guard_1.RequirePermissions)('inventory:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List inventory items' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BasicModulesController.prototype, "findAllInventory", null);
__decorate([
    (0, common_1.Post)('inventory/items'),
    (0, permissions_guard_1.RequirePermissions)('inventory:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Add inventory item' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BasicModulesController.prototype, "createInventory", null);
exports.BasicModulesController = BasicModulesController = __decorate([
    (0, swagger_1.ApiTags)('Basic Modules (Library, Transport, Inventory)'),
    (0, common_1.Controller)('api/v1/modules'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [basic_modules_service_1.BasicModulesService])
], BasicModulesController);
//# sourceMappingURL=basic-modules.controller.js.map