"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let OnboardService = class OnboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkSubdomain(subdomain) {
        const reserved = ['owner', 'api', 'www', 'admin', 'support', 'mail', 'localhost', '127'];
        if (reserved.includes(subdomain.toLowerCase())) {
            return { available: false, message: 'Reserved subdomain' };
        }
        const existing = await this.prisma.tenant.findUnique({
            where: { subdomain: subdomain.toLowerCase() },
        });
        return {
            available: !existing,
            message: existing ? 'Subdomain already taken' : 'Available'
        };
    }
    async registerTenant(data) {
        const { schoolName, subdomain, planId, adminName, adminEmail, adminPhone, password } = data;
        const check = await this.checkSubdomain(subdomain);
        if (!check.available) {
            throw new common_1.ConflictException(check.message);
        }
        let plan;
        if (planId) {
            plan = await this.prisma.plan.findUnique({ where: { id: planId } });
        }
        else {
            plan = await this.prisma.plan.findFirst({ where: { name: 'Basic' } });
        }
        if (!plan)
            throw new common_1.NotFoundException('Subscription plan not found');
        const hashedPassword = await bcrypt.hash(password, 10);
        return await this.prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: schoolName,
                    subdomain: subdomain.toLowerCase(),
                    contactEmail: adminEmail,
                    contactPhone: adminPhone,
                    status: 'active',
                },
            });
            await tx.tenantDomain.create({
                data: {
                    tenantId: tenant.id,
                    domain: subdomain.toLowerCase(),
                },
            });
            const trialDays = plan.limitsJson?.trialDays || 30;
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + trialDays);
            await tx.tenantSubscription.create({
                data: {
                    tenantId: tenant.id,
                    planId: plan.id,
                    status: 'trial',
                    trialEnd,
                },
            });
            const permissions = await tx.permission.findMany();
            const roleNames = [
                'Super Admin', 'Principal', 'Deputy Principal', 'Exam Officer',
                'Bursar/Accountant', 'HR/Admin', 'Teacher', 'Class Teacher',
                'Librarian', 'Transport Officer', 'Parent', 'Student'
            ];
            const createdRoles = {};
            for (const name of roleNames) {
                const role = await tx.role.create({
                    data: {
                        tenantId: tenant.id,
                        name,
                    },
                });
                createdRoles[name] = role.id;
                if (name === 'Super Admin') {
                    for (const p of permissions) {
                        await tx.rolePermission.create({
                            data: {
                                roleId: role.id,
                                permissionKey: p.key,
                            },
                        });
                    }
                }
            }
            const user = await tx.user.create({
                data: {
                    tenantId: tenant.id,
                    email: adminEmail,
                    phone: adminPhone,
                    passwordHash: hashedPassword,
                    status: 'active',
                },
            });
            await tx.userRole.create({
                data: {
                    userId: user.id,
                    roleId: createdRoles['Super Admin'],
                },
            });
            await tx.schoolSetting.create({
                data: {
                    tenantId: tenant.id,
                    jsonSettings: {
                        levelTypesOffered: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'],
                        gradingTemplate: 'cbc-default',
                        examReuseWindow: 3,
                        attendanceMode: 'daily',
                        feeSettings: { currency: 'KES', receiptPrefix: 'RCP-' }
                    },
                },
            });
            return {
                message: 'Onboarding successful',
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    subdomain: tenant.subdomain,
                    loginUrl: `http://${tenant.subdomain}.localhost:8080/login`
                }
            };
        });
    }
};
exports.OnboardService = OnboardService;
exports.OnboardService = OnboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OnboardService);
//# sourceMappingURL=onboard.service.js.map