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
exports.AcademicsController = void 0;
const common_1 = require("@nestjs/common");
const academics_service_1 = require("./academics.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let AcademicsController = class AcademicsController {
    academicsService;
    constructor(academicsService) {
        this.academicsService = academicsService;
    }
    async findAllClasses(req) {
        return this.academicsService.findAllClasses(req.user.tenantId);
    }
    async findOneClass(req, id) {
        return this.academicsService.findOneClass(req.user.tenantId, id);
    }
    async createClass(req, data) {
        return this.academicsService.createClass(req.user.tenantId, data);
    }
    async updateClass(req, id, data) {
        return this.academicsService.updateClass(req.user.tenantId, id, data);
    }
    async deleteClass(req, id) {
        return this.academicsService.deleteClass(req.user.tenantId, id);
    }
    async findAllSubjects(req) {
        return this.academicsService.findAllSubjects(req.user.tenantId);
    }
    async createSubject(req, data) {
        return this.academicsService.createSubject(req.user.tenantId, data);
    }
    async deleteSubject(req, id) {
        return this.academicsService.deleteSubject(req.user.tenantId, id);
    }
    async findAllStrands(req, subjectId) {
        return this.academicsService.findAllStrands(req.user.tenantId, subjectId);
    }
    async createStrand(req, data) {
        return this.academicsService.createStrand(req.user.tenantId, data);
    }
    async createSubStrand(req, data) {
        return this.academicsService.createSubStrand(req.user.tenantId, data);
    }
};
exports.AcademicsController = AcademicsController;
__decorate([
    (0, common_1.Get)('classes'),
    (0, permissions_guard_1.RequirePermissions)('classes:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List all classes/streams' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AcademicsController.prototype, "findAllClasses", null);
__decorate([
    (0, common_1.Get)('classes/:id'),
    (0, permissions_guard_1.RequirePermissions)('classes:view'),
    (0, swagger_1.ApiOperation)({ summary: 'Get class stream details' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AcademicsController.prototype, "findOneClass", null);
__decorate([
    (0, common_1.Post)('classes'),
    (0, permissions_guard_1.RequirePermissions)('classes:create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new class stream' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AcademicsController.prototype, "createClass", null);
__decorate([
    (0, common_1.Put)('classes/:id'),
    (0, permissions_guard_1.RequirePermissions)('classes:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Update class stream' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AcademicsController.prototype, "updateClass", null);
__decorate([
    (0, common_1.Delete)('classes/:id'),
    (0, permissions_guard_1.RequirePermissions)('classes:delete'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete class stream' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AcademicsController.prototype, "deleteClass", null);
__decorate([
    (0, common_1.Get)('subjects'),
    (0, permissions_guard_1.RequirePermissions)('classes:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List all subjects / learning areas' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AcademicsController.prototype, "findAllSubjects", null);
__decorate([
    (0, common_1.Post)('subjects'),
    (0, permissions_guard_1.RequirePermissions)('classes:create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new subject' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AcademicsController.prototype, "createSubject", null);
__decorate([
    (0, common_1.Delete)('subjects/:id'),
    (0, permissions_guard_1.RequirePermissions)('classes:delete'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete subject' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AcademicsController.prototype, "deleteSubject", null);
__decorate([
    (0, common_1.Get)('cbc/strands'),
    (0, permissions_guard_1.RequirePermissions)('classes:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List CBC strands' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('subjectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AcademicsController.prototype, "findAllStrands", null);
__decorate([
    (0, common_1.Post)('cbc/strands'),
    (0, permissions_guard_1.RequirePermissions)('classes:create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a CBC strand' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AcademicsController.prototype, "createStrand", null);
__decorate([
    (0, common_1.Post)('cbc/sub-strands'),
    (0, permissions_guard_1.RequirePermissions)('classes:create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a CBC sub-strand' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AcademicsController.prototype, "createSubStrand", null);
exports.AcademicsController = AcademicsController = __decorate([
    (0, swagger_1.ApiTags)('Academics (Classes & Subjects)'),
    (0, common_1.Controller)('api/v1/academics'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [academics_service_1.AcademicsService])
], AcademicsController);
//# sourceMappingURL=academics.controller.js.map