"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const throttler_1 = require("@nestjs/throttler");
const prisma_module_1 = require("./prisma/prisma.module");
const tenancy_middleware_1 = require("./tenancy/tenancy.middleware");
const onboard_module_1 = require("./onboard/onboard.module");
const auth_module_1 = require("./auth/auth.module");
const rbac_module_1 = require("./rbac/rbac.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const students_module_1 = require("./students/students.module");
const staff_module_1 = require("./staff/staff.module");
const academics_module_1 = require("./academics/academics.module");
const attendance_module_1 = require("./attendance/attendance.module");
const exams_module_1 = require("./exams/exams.module");
const lms_module_1 = require("./lms/lms.module");
const finance_module_1 = require("./finance/finance.module");
const comms_module_1 = require("./comms/comms.module");
const settings_module_1 = require("./settings/settings.module");
const audit_module_1 = require("./audit/audit.module");
const basic_modules_module_1 = require("./basic-modules/basic-modules.module");
const owner_auth_module_1 = require("./owner/auth/owner-auth.module");
const owner_tenants_module_1 = require("./owner/tenants/owner-tenants.module");
const owner_plans_module_1 = require("./owner/plans/owner-plans.module");
const owner_subscriptions_module_1 = require("./owner/subscriptions/owner-subscriptions.module");
const owner_audit_module_1 = require("./owner/audit/owner-audit.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(tenancy_middleware_1.TenancyMiddleware)
            .forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([{
                    ttl: 60000,
                    limit: 10,
                }]),
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                },
            }),
            prisma_module_1.PrismaModule,
            onboard_module_1.OnboardModule,
            auth_module_1.AuthModule,
            rbac_module_1.RbacModule,
            dashboard_module_1.DashboardModule,
            students_module_1.StudentsModule,
            staff_module_1.StaffModule,
            academics_module_1.AcademicsModule,
            attendance_module_1.AttendanceModule,
            exams_module_1.ExamsModule,
            lms_module_1.LmsModule,
            finance_module_1.FinanceModule,
            comms_module_1.CommsModule,
            settings_module_1.SettingsModule,
            audit_module_1.AuditModule,
            basic_modules_module_1.BasicModulesModule,
            owner_auth_module_1.OwnerAuthModule,
            owner_tenants_module_1.OwnerTenantsModule,
            owner_plans_module_1.OwnerPlansModule,
            owner_subscriptions_module_1.OwnerSubscriptionModule,
            owner_audit_module_1.OwnerAuditModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map