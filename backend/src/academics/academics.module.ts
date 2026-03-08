import { Module } from '@nestjs/common';
import { AcademicsController } from './academics.controller';
import { AcademicsService } from './academics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AcademicsController],
    providers: [AcademicsService],
})
export class AcademicsModule { }
