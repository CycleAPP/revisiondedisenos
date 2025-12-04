
import prisma from "../src/config/prisma.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("--- DIAGNOSTIC START ---");

    // 1. Check Prisma Client Models
    console.log("\n1. Checking Prisma Client Models:");
    const models = Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'));
    console.log("Available models on prisma instance:", models);

    if (prisma.fileRecord) {
        console.log("✅ prisma.fileRecord is DEFINED");
    } else {
        console.log("❌ prisma.fileRecord is UNDEFINED");
    }

    if (prisma.fileAsset) {
        console.log("⚠️ prisma.fileAsset is DEFINED (Old model name?)");
    }

    // 2. Check Schema File
    console.log("\n2. Checking schema.prisma content:");
    try {
        const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
        if (fs.existsSync(schemaPath)) {
            const content = fs.readFileSync(schemaPath, "utf8");
            console.log(`Schema found at ${schemaPath}`);

            const hasFileRecord = content.includes("model FileRecord");
            const hasFileAsset = content.includes("model FileAsset");

            console.log(`Contains 'model FileRecord': ${hasFileRecord}`);
            console.log(`Contains 'model FileAsset': ${hasFileAsset}`);
        } else {
            console.log("❌ schema.prisma NOT FOUND at", schemaPath);
        }
    } catch (e) {
        console.error("Error reading schema:", e.message);
    }

    console.log("\n--- DIAGNOSTIC END ---");
    await prisma.$disconnect();
}

main();
