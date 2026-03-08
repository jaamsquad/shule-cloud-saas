import { Module } from '@nestjs/common';
import { OwnerAuthService } from './owner-auth.service';
import { OwnerAuthController } from './owner-auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OwnerJwtStrategy } from './owner-auth.guards';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../prisma/prisma.module';
import { OwnerAuditModule } from '../audit/owner-audit.module';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'owner-jwt' }),
        JwtModule.register({}),
        PrismaModule,
        ConfigModule,
        OwnerAuditModule,
    ],
    controllers: [OwnerAuthController],
    providers: [OwnerAuthService, OwnerJwtStrategy],
    exports: [OwnerAuthService],
})
export class OwnerAuthModule { }
