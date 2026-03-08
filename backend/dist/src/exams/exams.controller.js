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
exports.ExamsController = void 0;
const common_1 = require("@nestjs/common");
const exams_service_1 = require("./exams.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let ExamsController = class ExamsController {
    examsService;
    constructor(examsService) {
        this.examsService = examsService;
    }
    async findAllQuestions(req, query) {
        return this.examsService.findAllQuestions(req.user.tenantId, query);
    }
    async createQuestion(req, data) {
        return this.examsService.createQuestion(req.user.tenantId, data);
    }
    async approveQuestion(req, id) {
        return this.examsService.approveQuestion(req.user.tenantId, id, req.user.userId);
    }
    async findAllBlueprints(req) {
        return this.examsService.findAllBlueprints(req.user.tenantId);
    }
    async createBlueprint(req, data) {
        return this.examsService.createBlueprint(req.user.tenantId, data);
    }
    async generateExam(req, blueprintId) {
        return this.examsService.generateExam(req.user.tenantId, blueprintId, req.user.userId);
    }
    async publishPaper(req, id) {
        return this.examsService.publishPaper(req.user.tenantId, id);
    }
    async submitScores(req, id, scores) {
        return this.examsService.submitScores(req.user.tenantId, id, scores, req.user.userId);
    }
};
exports.ExamsController = ExamsController;
__decorate([
    (0, common_1.Get)('question-bank'),
    (0, permissions_guard_1.RequirePermissions)('exams:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List questions' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "findAllQuestions", null);
__decorate([
    (0, common_1.Post)('question-bank'),
    (0, permissions_guard_1.RequirePermissions)('exams:create'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a new question' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "createQuestion", null);
__decorate([
    (0, common_1.Patch)('question-bank/:id/approve'),
    (0, permissions_guard_1.RequirePermissions)('exams:approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a question' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "approveQuestion", null);
__decorate([
    (0, common_1.Get)('blueprints'),
    (0, permissions_guard_1.RequirePermissions)('exams:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List all exam blueprints' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "findAllBlueprints", null);
__decorate([
    (0, common_1.Post)('blueprints'),
    (0, permissions_guard_1.RequirePermissions)('exams:create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new exam blueprint' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "createBlueprint", null);
__decorate([
    (0, common_1.Post)('generate'),
    (0, permissions_guard_1.RequirePermissions)('exams:create'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate versions of an exam from a blueprint' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('blueprintId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "generateExam", null);
__decorate([
    (0, common_1.Patch)('papers/:id/publish'),
    (0, permissions_guard_1.RequirePermissions)('exams:publish'),
    (0, swagger_1.ApiOperation)({ summary: 'Publish exam paper' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "publishPaper", null);
__decorate([
    (0, common_1.Post)('papers/:id/scores'),
    (0, permissions_guard_1.RequirePermissions)('results:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk submit student scores' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('scores')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Array]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "submitScores", null);
exports.ExamsController = ExamsController = __decorate([
    (0, swagger_1.ApiTags)('Exams & Question Bank'),
    (0, common_1.Controller)('api/v1/exams'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [exams_service_1.ExamsService])
], ExamsController);
//# sourceMappingURL=exams.controller.js.map