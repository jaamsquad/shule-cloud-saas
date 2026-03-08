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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding MVP data...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
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
//# sourceMappingURL=seed.js.map