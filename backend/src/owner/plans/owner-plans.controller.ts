import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { OwnerPlansService } from './owner-plans.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Owner - Plans')
@Controller('owner/plans')
@UseGuards(AuthGuard('owner-jwt'))
@ApiBearerAuth()
export class OwnerPlansController {
    constructor(private readonly plansService: OwnerPlansService) { }

    @Get()
    @ApiOperation({ summary: 'List all subscription plans' })
    async findAll() {
        return this.plansService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get plan details' })
    async findOne(@Param('id') id: string) {
        return this.plansService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new subscription plan' })
    async create(@Body() dto: any) {
        return this.plansService.create(dto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a subscription plan' })
    async update(@Param('id') id: string, @Body() dto: any) {
        return this.plansService.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a subscription plan' })
    async delete(@Param('id') id: string) {
        return this.plansService.delete(id);
    }
}
