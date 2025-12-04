
import { env } from "../src/config/env.js"; // Load env vars first
import prisma from "../src/config/prisma.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    try {
        const sqlPath = path.join(__dirname, "migrate-db.sql");
        const sql = fs.readFileSync(sqlPath, "utf8");

        // Split SQL into individual DO blocks
        const commands = sql
            .split(/\n\n/)
            .filter(cmd => cmd.trim().length > 0 && !cmd.trim().startsWith('--'));

        console.log(`Executing ${commands.length} SQL commands...`);

        for (let i = 0; i < commands.length; i++) {
            const cmd = commands[i].trim();
            if (cmd) {
                console.log(`- Executing command ${i + 1}/${commands.length}...`);
                await prisma.$executeRawUnsafe(cmd);
            }
        }

        console.log("✅ All SQL commands executed successfully.");

    } catch (e) {
        console.error("❌ Error executing SQL:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
