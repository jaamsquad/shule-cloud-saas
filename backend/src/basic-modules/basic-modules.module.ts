import { Module } from '@nestjs/common';
import { BasicModulesController } from './basic-modules.controller';
import { BasicModulesService } from './basic-modules.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [BasicModulesController],
    providers: [BasicModulesService],
})
export class BasicModulesModule { }
