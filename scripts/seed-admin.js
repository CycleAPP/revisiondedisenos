import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // Create Admin User
    const adminEmail = 'admin@demo.com';
    const adminPassword = 'admin';

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            name: 'Admin User',
            password: adminPassword,
            role: 'ADMIN',
        },
    });

    console.log(`👤 Admin user created: ${admin.email} / ${adminPassword}`);

    // Create Leader User
    const leaderEmail = 'leader@demo.com';
    const leaderPassword = 'leader';
    const leader = await prisma.user.upsert({
        where: { email: leaderEmail },
        update: {},
        create: {
            email: leaderEmail,
            name: 'Leader User',
            password: leaderPassword,
            role: 'LEADER',
        },
    });
    console.log(`👤 Leader user created: ${leader.email} / ${leaderPassword}`);

    // Create Designer User
    const designerEmail = 'designer@demo.com';
    const designerPassword = 'designer';
    const designer = await prisma.user.upsert({
        where: { email: designerEmail },
        update: {},
        create: {
            email: designerEmail,
            name: 'Designer User',
            password: designerPassword,
            role: 'DESIGNER',
        },
    });
    console.log(`👤 Designer user created: ${designer.email} / ${designerPassword}`);

    console.log('✅ Seed finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
