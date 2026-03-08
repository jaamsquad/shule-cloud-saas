import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
    constructor(private prisma: PrismaService) { }

    // Fee Structures
    async findAllFeeStructures(tenantId: string) {
        return this.prisma.feeStructure.findMany({
            where: { tenantId },
            include: { class: true, term: true },
        });
    }

    async createFeeStructure(tenantId: string, data: any) {
        return this.prisma.feeStructure.create({
            data: { ...data, tenantId },
        });
    }

    // Invoices
    async findAllInvoices(tenantId: string, query: any) {
        return this.prisma.invoice.findMany({
            where: { tenantId, studentId: query.studentId || undefined, status: query.status || undefined },
            include: { student: true, term: true },
        });
    }

    async createInvoice(tenantId: string, data: any) {
        return this.prisma.invoice.create({
            data: { ...data, tenantId },
        });
    }

    // Payments & Receipts
    async recordPayment(tenantId: string, data: any, receivedBy: string) {
        const { invoiceId, amount, method, reference } = data;
        return this.prisma.$transaction(async (tx) => {
            // 1. Create Payment
            const payment = await tx.payment.create({
                data: { tenantId, invoiceId, amount, method, reference, receivedBy },
            });

            // 2. Update Invoice status
            const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
            if (!invoice) throw new NotFoundException('Invoice not found');
            const totalPaid = (await tx.payment.aggregate({
                where: { invoiceId },
                _sum: { amount: true }
            }))._sum.amount || 0;
            const newStatus = Number(totalPaid) >= Number(invoice.amount) ? 'paid' : 'partial';
            await tx.invoice.update({
                where: { id: invoiceId },
                data: { status: newStatus },
            });

            // 3. Create Receipt
            const receiptPrefix = 'RCP-'; // Should be from settings
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

    async findAllReceipts(tenantId: string) {
        return this.prisma.receipt.findMany({
            where: { tenantId },
            include: { payment: { include: { invoice: { include: { student: true } } } } },
        });
    }
}
