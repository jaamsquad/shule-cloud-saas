import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding MVP data...');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 1. Seed Owner Permissions
    const ownerPermissions = [
        'tenants:view', 'tenants:create', 'tenants:edit', 'tenants:suspend', 'tenants:delete',
        'plans:view', 'plans:create', 'plans:edit',
        'billing:view', 'billing:edit',
        'support:view', 'support:reply', 'support:close',
        'platform_settings:view', 'platform_settings:edit',
        'security:view', 'security:ban_ip',
        'owner_audit:view'
    ];

    for (const key of ownerPermissions) {
        await prisma.ownerPermission.upsert({
            where: { key },
            update: {},
            create: { key }
        });
    }

    // 2. Seed Owner Roles
    const ownerRoles = [
        { name: 'Owner Super Admin', permissions: ownerPermissions },
        { name: 'Owner Support Agent', permissions: ['tenants:view', 'support:view', 'support:reply'] },
        { name: 'Owner Finance', permissions: ['tenants:view', 'billing:view', 'billing:edit'] },
        { name: 'Owner Developer/Ops', permissions: ownerPermissions },
        { name: 'Owner Read Only', permissions: ['tenants:view', 'plans:view', 'support:view'] }
    ];

    for (const roleDef of ownerRoles) {
        const role = await prisma.ownerRole.upsert({
            where: { name: roleDef.name },
            update: {},
            create: { name: roleDef.name }
        });

        for (const pKey of roleDef.permissions) {
            const perm = await prisma.ownerPermission.findUnique({ where: { key: pKey } });
            if (perm) {
                await prisma.ownerRolePermission.upsert({
                    where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
                    update: {},
                    create: { roleId: role.id, permissionId: perm.id }
                });
            }
        }
    }

    // 3. Create Owner User
    const ownerUser = await prisma.ownerUser.upsert({
        where: { email: 'owner@shulecloud.co.ke' },
        update: {},
        create: {
            email: 'owner@shulecloud.co.ke',
            passwordHash: hashedPassword,
            status: 'active'
        }
    });

    const superAdminRole = await prisma.ownerRole.findUnique({ where: { name: 'Owner Super Admin' } });
    if (superAdminRole) {
        await prisma.ownerUserRole.upsert({
            where: { userId_roleId: { userId: ownerUser.id, roleId: superAdminRole.id } },
            update: {},
            create: { userId: ownerUser.id, roleId: superAdminRole.id }
        });
    }

    // 4. Seed Tenant Permissions (Global list)
    const tenantPermissions = [
        'students:view', 'students:create', 'students:edit', 'students:delete',
        'parents:view', 'parents:create', 'parents:edit', 'parents:delete',
        'staff:view', 'staff:create', 'staff:edit', 'staff:delete',
        'classes:view', 'classes:create', 'classes:edit', 'classes:delete',
        'attendance:view', 'attendance:mark', 'attendance:edit', 'attendance:report',
        'exams:view', 'exams:create', 'exams:edit', 'exams:approve', 'exams:publish',
        'results:view', 'results:edit', 'results:publish', 'results:lock',
        'lms:view', 'lms:create_course', 'lms:edit_course', 'lms:publish_course', 'lms:grade',
        'fees:view', 'fees:create_invoice', 'fees:record_payment', 'fees:refund', 'fees:reports',
        'comms:view', 'comms:send', 'comms:edit_templates',
        'settings:view', 'settings:edit',
        'audit:view'
    ];

    for (const key of tenantPermissions) {
        await prisma.permission.upsert({
            where: { key },
            update: {},
            create: { key }
        });
    }

    // 5. Seed Subscription Plans
    const plans = [
        {
            name: 'Basic',
            priceMonthly: 5000,
            maxStudents: 200,
            moduleToggles: { lms: false, exams: true, finance: true }
        },
        {
            name: 'Standard',
            priceMonthly: 15000,
            maxStudents: 600,
            moduleToggles: { lms: true, exams: true, finance: true }
        },
        {
            name: 'Premium',
            priceMonthly: 35000,
            maxStudents: 2000,
            moduleToggles: { lms: true, exams: true, finance: true }
        }
    ];

    for (const p of plans) {
        await prisma.plan.upsert({
            where: { name: p.name },
            update: {
                priceMonthly: p.priceMonthly,
                maxStudents: p.maxStudents,
                moduleToggles: p.moduleToggles
            },
            create: {
                name: p.name,
                priceMonthly: p.priceMonthly,
                billingCycle: 'monthly',
                maxStudents: p.maxStudents,
                moduleToggles: p.moduleToggles
            }
        });
    }

    console.log('Global seed completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
