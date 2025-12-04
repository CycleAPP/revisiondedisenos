
import { env } from "../src/config/env.js"; // Load env vars first
import prisma from "../src/config/prisma.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    try {
        console.log("🔍 Checking database types...\n");

        console.log("Step 1: Drop unused 'Status' type if it exists...");
        await prisma.$executeRawUnsafe(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Status') THEN
                    DROP TYPE "Status" CASCADE;
                    RAISE NOTICE 'Dropped existing Status type';
                END IF;
            END$$;
        `);
        console.log("✅ Step 1 complete\n");

        console.log("Step 2: Rename 'AssignmentStatus' to 'Status'...");
        await prisma.$executeRawUnsafe(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssignmentStatus') THEN
                    ALTER TYPE "AssignmentStatus" RENAME TO "Status";
                    RAISE NOTICE 'Renamed AssignmentStatus to Status';
                ELSIF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Status') THEN
                    CREATE TYPE "Status" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'APPROVED', 'REJECTED');
                    RAISE NOTICE 'Created Status enum';
                END IF;
            END$$;
        `);
        console.log("✅ Step 2 complete\n");

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
        console.log("✅ Step 3 complete\n");

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
        console.log("✅ Step 4 complete\n");

        console.log("🎉 All database migrations completed successfully!");
        console.log("\n📝 Next step: Run 'pm2 restart diseno-empaque'\n");

    } catch (e) {
        console.error("\n❌ Error executing SQL:", e.message);
        console.error("\nPlease contact support with this error message.");
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
