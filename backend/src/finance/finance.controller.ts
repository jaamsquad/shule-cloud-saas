import { Controller, Post, Body, Get, UseGuards, Request, Delete, Query, Param, Patch } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('Finance (Fees & Invoices)')
@Controller('api/v1/finance')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class FinanceController {
    constructor(private readonly financeService: FinanceService) { }

    @Get('fee-structures')
    @RequirePermissions('finance:view')
    @ApiOperation({ summary: 'List all fee structures' })
    async findAllFeeStructures(@Request() req) {
        return this.financeService.findAllFeeStructures(req.user.tenantId);
    }

    @Post('fee-structures')
    @RequirePermissions('finance:edit')
    @ApiOperation({ summary: 'Create a fee structure' })
    async createFeeStructure(@Request() req, @Body() data: any) {
        return this.financeService.createFeeStructure(req.user.tenantId, data);
    }

    @Get('invoices')
    @RequirePermissions('finance:view')
    @ApiOperation({ summary: 'List all student invoices' })
    async findAllInvoices(@Request() req, @Query() query: any) {
        return this.financeService.findAllInvoices(req.user.tenantId, query);
    }

    @Post('invoices')
    @RequirePermissions('finance:edit')
    @ApiOperation({ summary: 'Create student invoice' })
    async createInvoice(@Request() req, @Body() data: any) {
        return this.financeService.createInvoice(req.user.tenantId, data);
    }

    @Post('payments')
    @RequirePermissions('finance:edit')
    @ApiOperation({ summary: 'Record payment and generate receipt' })
    async recordPayment(@Request() req, @Body() data: any) {
        return this.financeService.recordPayment(req.user.tenantId, data, req.user.userId);
    }

    @Get('receipts')
    @RequirePermissions('finance:view')
    @ApiOperation({ summary: 'List all receipts' })
    async findAllReceipts(@Request() req) {
        return this.financeService.findAllReceipts(req.user.tenantId);
    }
}
