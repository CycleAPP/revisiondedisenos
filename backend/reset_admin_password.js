import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
process.env.DATABASE_URL = "postgresql://ph43rn:12345@127.0.0.1:5432/diseno_empaque?schema=public";

async function main() {
    const email = 'admin@demo.com';
    const password = await bcrypt.hash('admin', 10);

    const user = await prisma.user.update({
        where: { email },
        data: { password }
    });

    console.log(`Password for ${email} reset to 'admin'.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
