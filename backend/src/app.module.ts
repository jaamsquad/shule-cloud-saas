import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { TenancyMiddleware } from './tenancy/tenancy.middleware';

// Core Application Modules
import { OnboardModule } from './onboard/onboard.module';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { StudentsModule } from './students/students.module';
import { StaffModule } from './staff/staff.module';
import { AcademicsModule } from './academics/academics.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ExamsModule } from './exams/exams.module';
import { LmsModule } from './lms/lms.module';
import { FinanceModule } from './finance/finance.module';
import { CommsModule } from './comms/comms.module';
import { SettingsModule } from './settings/settings.module';
import { AuditModule } from './audit/audit.module';
import { BasicModulesModule } from './basic-modules/basic-modules.module';

// Owner Modules
import { OwnerAuthModule } from './owner/auth/owner-auth.module';
import { OwnerTenantsModule } from './owner/tenants/owner-tenants.module';
import { OwnerPlansModule } from './owner/plans/owner-plans.module';
import { OwnerSubscriptionModule } from './owner/subscriptions/owner-subscriptions.module';
import { OwnerAuditModule } from './owner/audit/owner-audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    PrismaModule,

    // Core Modules
    OnboardModule,
    AuthModule,
    RbacModule,
    DashboardModule,
    StudentsModule,
    StaffModule,
    AcademicsModule,
    AttendanceModule,
    ExamsModule,
    LmsModule,
    FinanceModule,
    CommsModule,
    SettingsModule,
    AuditModule,
    BasicModulesModule,

    // Owner Ecosystem
    OwnerAuthModule,
    OwnerTenantsModule,
    OwnerPlansModule,
    OwnerSubscriptionModule,
    OwnerAuditModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenancyMiddleware)
      .forRoutes('*');
  }
}
