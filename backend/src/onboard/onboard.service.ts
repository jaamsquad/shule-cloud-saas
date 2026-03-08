import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OnboardService {
    constructor(private prisma: PrismaService) { }

    async checkSubdomain(subdomain: string) {
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

    async registerTenant(data: any) {
        const { schoolName, subdomain, planId, adminName, adminEmail, adminPhone, password } = data;

        // 1. Validate subdomain
        const check = await this.checkSubdomain(subdomain);
        if (!check.available) {
            throw new ConflictException(check.message);
        }

        let plan;
        if (planId) {
            plan = await this.prisma.plan.findUnique({ where: { id: planId } });
        } else {
            plan = await this.prisma.plan.findFirst({ where: { name: 'Basic' } });
        }

        if (!plan) throw new NotFoundException('Subscription plan not found');

        const hashedPassword = await bcrypt.hash(password, 10);

        return await this.prisma.$transaction(async (tx) => {
            // 2. Create Tenant
            const tenant = await tx.tenant.create({
                data: {
                    name: schoolName,
                    subdomain: subdomain.toLowerCase(),
                    contactEmail: adminEmail,
                    contactPhone: adminPhone,
                    status: 'active',
                },
            });

            // 3. Create Tenant Domain
            await tx.tenantDomain.create({
                data: {
                    tenantId: tenant.id,
                    domain: subdomain.toLowerCase(),
                },
            });

            // 4. Create Subscription
            const trialDays = (plan.limitsJson as any)?.trialDays || 30;
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

            // 5. Seed Default Roles and Permissions for this tenant
            const permissions = await tx.permission.findMany();
            const roleNames = [
                'Super Admin', 'Principal', 'Deputy Principal', 'Exam Officer',
                'Bursar/Accountant', 'HR/Admin', 'Teacher', 'Class Teacher',
                'Librarian', 'Transport Officer', 'Parent', 'Student'
            ];

            const createdRoles: Record<string, string> = {};

            for (const name of roleNames) {
                const role = await tx.role.create({
                    data: {
                        tenantId: tenant.id,
                        name,
                    },
                });
                createdRoles[name] = role.id;

                // Super Admin gets all permissions
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

            // 6. Create Admin User
            const user = await tx.user.create({
                data: {
                    tenantId: tenant.id,
                    email: adminEmail,
                    phone: adminPhone,
                    passwordHash: hashedPassword,
                    status: 'active',
                },
            });

            // Assign Super Admin role to the first user
            await tx.userRole.create({
                data: {
                    userId: user.id,
                    roleId: createdRoles['Super Admin'],
                },
            });

            // 7. Seed Settings
            await tx.schoolSetting.create({
                data: {
                    tenantId: tenant.id,
                    jsonSettings: {
                        levelTypesOffered: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'],
                        gradingTemplate: 'cbc-default',
                        examReuseWindow: 3, // years
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
}
