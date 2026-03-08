import { Module } from '@nestjs/common';
import { OwnerSubscriptionService } from './owner-subscriptions.service';
import { OwnerSubscriptionController } from './owner-subscriptions.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [OwnerSubscriptionController],
    providers: [OwnerSubscriptionService],
})
export class OwnerSubscriptionModule { }
