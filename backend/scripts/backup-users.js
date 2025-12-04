import prisma from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import fs from "fs";

async function main() {
    try {
        console.log("📦 Backing up users...\n");

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                password: true,
                role: true,
                teamId: true
            }
        });

        const backup = {
            timestamp: new Date().toISOString(),
            users: users
        };

        fs.writeFileSync(
            "backup-users.json",
            JSON.stringify(backup, null, 2),
            "utf8"
        );

        console.log(`✅ Backed up ${users.length} users to backup-users.json\n`);
        console.log("Users:", users.map(u => `${u.email} (${u.role})`).join(", "));

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
