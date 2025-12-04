
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

        console.log("Executing SQL fix...");
        await prisma.$executeRawUnsafe(sql);
        console.log("✅ SQL executed successfully.");

    } catch (e) {
        console.error("❌ Error executing SQL:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
