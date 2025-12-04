
import { env } from "../src/config/env.js"; // Load env vars first
import prisma from "../src/config/prisma.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    try {
        console.log("Step 1: Renaming AssignmentStatus to Status (if exists)...");
        await prisma.$executeRawUnsafe(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssignmentStatus') THEN
                    ALTER TYPE "AssignmentStatus" RENAME TO "Status";
                    RAISE NOTICE 'Renamed AssignmentStatus to Status';
                END IF;
            END$$;
        `);
        console.log("✅ Step 1 complete");

        console.log("Step 2: Creating Status enum (if missing)...");
        await prisma.$executeRawUnsafe(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Status') THEN
                    CREATE TYPE "Status" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'APPROVED', 'REJECTED');
                    RAISE NOTICE 'Created Status enum';
                END IF;
            END$$;
        `);
        console.log("✅ Step 2 complete");

        console.log("Step 3: Creating Role enum (if missing)...");
        await prisma.$executeRawUnsafe(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
                    CREATE TYPE "Role" AS ENUM ('ADMIN', 'LEADER', 'DESIGNER');
                    RAISE NOTICE 'Created Role enum';
                END IF;
            END$$;
        `);
        console.log("✅ Step 3 complete");

        console.log("Step 4: Creating FileType enum (if missing)...");
        await prisma.$executeRawUnsafe(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FileType') THEN
                    CREATE TYPE "FileType" AS ENUM ('EXCEL', 'DESIGN');
                    RAISE NOTICE 'Created FileType enum';
                END IF;
            END$$;
        `);
        console.log("✅ Step 4 complete");

        console.log("\n🎉 All database migrations completed successfully!");

    } catch (e) {
        console.error("❌ Error executing SQL:", e.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
