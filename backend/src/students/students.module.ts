import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { GuardiansController } from './guardians.controller';
import { GuardiansService } from './guardians.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [StudentsController, GuardiansController],
    providers: [StudentsService, GuardiansService],
})
export class StudentsModule { }
