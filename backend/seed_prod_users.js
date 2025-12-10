import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env
const envPath = path.join(__dirname, '.env');
// Hardcode for reliability
process.env.DATABASE_URL = "postgresql://ph43rn:12345@127.0.0.1:5432/diseno_empaque?schema=public";

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('admin', 10); // Default password for restored users

    const users = [
        {
            email: 'designteamlumina@gmail.com',
            name: 'Design Team Lumina',
            role: 'ADMIN', // Assuming admin role for this team email
            password
        },
        {
            email: 'admin@demo.com',
            name: 'Administrador',
            role: 'ADMIN',
            password
        }
    ];

    for (const u of users) {
        const existing = await prisma.user.findUnique({ where: { email: u.email } });
        if (!existing) {
            await prisma.user.create({ data: u });
            console.log(`Created user: ${u.email}`);
        } else {
            // Optional: Update password if needed, or just skip
            console.log(`User already exists: ${u.email}`);
            // await prisma.user.update({ where: { id: existing.id }, data: { password: u.password } });
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
