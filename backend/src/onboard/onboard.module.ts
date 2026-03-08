import { Module } from '@nestjs/common';
import { OnboardController } from './onboard.controller';
import { OnboardService } from './onboard.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [OnboardController],
    providers: [OnboardService],
})
export class OnboardModule { }
