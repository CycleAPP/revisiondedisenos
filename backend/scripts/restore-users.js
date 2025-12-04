import prisma from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import fs from "fs";

async function main() {
    try {
        if (!fs.existsSync("backup-users.json")) {
            console.error("❌ No se encontró backup-users.json");
            console.log("Por favor ejecuta primero: node scripts/backup-users.js");
            process.exit(1);
        }

        const backup = JSON.parse(fs.readFileSync("backup-users.json", "utf8"));

        console.log(`📦 Restaurando ${backup.users.length} usuarios...\n`);

        for (const user of backup.users) {
            await prisma.user.upsert({
                where: { email: user.email },
                update: {
                    name: user.name,
                    password: user.password,
                    role: user.role
                },
                create: {
                    email: user.email,
                    name: user.name,
                    password: user.password,
                    role: user.role
                }
            });
            console.log(`✅ ${user.email}`);
        }

        console.log(`\n🎉 ${backup.users.length} usuarios restaurados exitosamente!`);

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
