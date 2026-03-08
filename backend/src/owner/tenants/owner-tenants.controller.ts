import { Controller, Get, Post, Body, Param, Put, UseGuards, Request } from '@nestjs/common';
import { OwnerTenantsService } from './owner-tenants.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Owner - Tenants')
@Controller('owner/tenants')
@UseGuards(AuthGuard('owner-jwt'))
@ApiBearerAuth()
export class OwnerTenantsController {
    constructor(private readonly tenantsService: OwnerTenantsService) { }

    @Get()
    @ApiOperation({ summary: 'List all tenants' })
    async findAll() {
        return this.tenantsService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get tenant details' })
    async findOne(@Param('id') id: string) {
        return this.tenantsService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new tenant manually' })
    async create(@Body() dto: any) {
        return this.tenantsService.create(dto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update tenant metadata' })
    async update(@Param('id') id: string, @Body() dto: any) {
        return this.tenantsService.update(id, dto);
    }

    @Post(':id/suspend')
    @ApiOperation({ summary: 'Suspend a tenant' })
    async suspend(@Param('id') id: string) {
        return this.tenantsService.setStatus(id, 'suspended');
    }

    @Post(':id/activate')
    @ApiOperation({ summary: 'Activate a tenant' })
    async activate(@Param('id') id: string) {
        return this.tenantsService.setStatus(id, 'active');
    }

    @Post(':id/cancel')
    @ApiOperation({ summary: 'Cancel a tenant' })
    async cancel(@Param('id') id: string) {
        return this.tenantsService.setStatus(id, 'cancelled');
    }
}
