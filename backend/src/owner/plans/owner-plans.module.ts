import { Module } from '@nestjs/common';
import { OwnerPlansService } from './owner-plans.service';
import { OwnerPlansController } from './owner-plans.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [OwnerPlansController],
    providers: [OwnerPlansService],
})
export class OwnerPlansModule { }
