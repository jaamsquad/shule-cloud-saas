import { Module } from '@nestjs/common';
import { CommsController } from './comms.controller';
import { CommsService } from './comms.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CommsController],
    providers: [CommsService],
})
export class CommsModule { }
