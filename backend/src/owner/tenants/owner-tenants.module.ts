import { Module } from '@nestjs/common';
import { OwnerTenantsService } from './owner-tenants.service';
import { OwnerTenantsController } from './owner-tenants.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [OwnerTenantsController],
    providers: [OwnerTenantsService],
})
export class OwnerTenantsModule { }
