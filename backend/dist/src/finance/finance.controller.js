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
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const finance_service_1 = require("./finance.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let FinanceController = class FinanceController {
    financeService;
    constructor(financeService) {
        this.financeService = financeService;
    }
    async findAllFeeStructures(req) {
        return this.financeService.findAllFeeStructures(req.user.tenantId);
    }
    async createFeeStructure(req, data) {
        return this.financeService.createFeeStructure(req.user.tenantId, data);
    }
    async findAllInvoices(req, query) {
        return this.financeService.findAllInvoices(req.user.tenantId, query);
    }
    async createInvoice(req, data) {
        return this.financeService.createInvoice(req.user.tenantId, data);
    }
    async recordPayment(req, data) {
        return this.financeService.recordPayment(req.user.tenantId, data, req.user.userId);
    }
    async findAllReceipts(req) {
        return this.financeService.findAllReceipts(req.user.tenantId);
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Get)('fee-structures'),
    (0, permissions_guard_1.RequirePermissions)('finance:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List all fee structures' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "findAllFeeStructures", null);
__decorate([
    (0, common_1.Post)('fee-structures'),
    (0, permissions_guard_1.RequirePermissions)('finance:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a fee structure' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createFeeStructure", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, permissions_guard_1.RequirePermissions)('finance:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List all student invoices' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "findAllInvoices", null);
__decorate([
    (0, common_1.Post)('invoices'),
    (0, permissions_guard_1.RequirePermissions)('finance:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Create student invoice' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createInvoice", null);
__decorate([
    (0, common_1.Post)('payments'),
    (0, permissions_guard_1.RequirePermissions)('finance:edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Record payment and generate receipt' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "recordPayment", null);
__decorate([
    (0, common_1.Get)('receipts'),
    (0, permissions_guard_1.RequirePermissions)('finance:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List all receipts' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "findAllReceipts", null);
exports.FinanceController = FinanceController = __decorate([
    (0, swagger_1.ApiTags)('Finance (Fees & Invoices)'),
    (0, common_1.Controller)('api/v1/finance'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [finance_service_1.FinanceService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map