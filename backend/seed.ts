import prisma from './src/lib/prisma';

async function seed() {
    console.log('Seeding database...');

    // Create Basic Plan
    const basicPlan = await prisma.plan.upsert({
        where: { name: 'Basic' },
        update: {},
        create: {
            name: 'Basic',
            description: 'Essential features for small schools',
            price: 5000,
            billingCycle: 'monthly',
            limitsJson: { trialDays: 30 }
        }
    });
    console.log('Plan created:', basicPlan.name);

    // Create default permissions
    const permissions = [
        { name: 'View Dashboard', key: 'dashboard.view' },
        { name: 'Manage Students', key: 'students.manage' },
        { name: 'Manage Staff', key: 'staff.manage' },
        { name: 'Manage Finance', key: 'finance.manage' }
    ];

    for (const p of permissions) {
        await prisma.permission.upsert({
            where: { key: p.key },
            update: {},
            create: p
        });
    }
    console.log('Permissions seeded');
    
    console.log('Seed complete!');
}

seed()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
