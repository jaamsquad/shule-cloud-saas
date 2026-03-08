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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let FinanceService = class FinanceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllFeeStructures(tenantId) {
        return this.prisma.feeStructure.findMany({
            where: { tenantId },
            include: { class: true, term: true },
        });
    }
    async createFeeStructure(tenantId, data) {
        return this.prisma.feeStructure.create({
            data: { ...data, tenantId },
        });
    }
    async findAllInvoices(tenantId, query) {
        return this.prisma.invoice.findMany({
            where: { tenantId, studentId: query.studentId || undefined, status: query.status || undefined },
            include: { student: true, term: true },
        });
    }
    async createInvoice(tenantId, data) {
        return this.prisma.invoice.create({
            data: { ...data, tenantId },
        });
    }
    async recordPayment(tenantId, data, receivedBy) {
        const { invoiceId, amount, method, reference } = data;
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: { tenantId, invoiceId, amount, method, reference, receivedBy },
            });
            const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
            if (!invoice)
                throw new common_1.NotFoundException('Invoice not found');
            const totalPaid = (await tx.payment.aggregate({
                where: { invoiceId },
                _sum: { amount: true }
            }))._sum.amount || 0;
            const newStatus = Number(totalPaid) >= Number(invoice.amount) ? 'paid' : 'partial';
            await tx.invoice.update({
                where: { id: invoiceId },
                data: { status: newStatus },
            });
            const receiptPrefix = 'RCP-';
            const receiptCount = await tx.receipt.count({ where: { tenantId } });
            const receiptNo = `${receiptPrefix}${(receiptCount + 1).toString().padStart(5, '0')}`;
            return tx.receipt.create({
                data: {
                    tenantId,
                    paymentId: payment.id,
                    receiptNo,
                }
            });
        });
    }
    async findAllReceipts(tenantId) {
        return this.prisma.receipt.findMany({
            where: { tenantId },
            include: { payment: { include: { invoice: { include: { student: true } } } } },
        });
    }
};
exports.FinanceService = FinanceService;
exports.FinanceService = FinanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FinanceService);
//# sourceMappingURL=finance.service.js.map