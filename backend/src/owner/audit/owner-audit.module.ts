import { Module, Global } from '@nestjs/common';
import { OwnerAuditService } from './owner-audit.service';
import { OwnerAuditController } from './owner-audit.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
    imports: [PrismaModule],
    controllers: [OwnerAuditController],
    providers: [OwnerAuditService],
    exports: [OwnerAuditService],
})
export class OwnerAuditModule { }
