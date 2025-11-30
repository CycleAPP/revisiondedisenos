import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log("Database URL loaded:", process.env.DATABASE_URL ? "YES" : "NO");
if (process.env.DATABASE_URL) {
    console.log("DB URL Protocol:", process.env.DATABASE_URL.split(':')[0]);
    console.log("DB URL Host:", process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || "Unknown");
}

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Attempting to delete Assignment ID 103...");

        // Check if it exists
        const assignment = await prisma.assignment.findUnique({
            where: { id: 103 }
        });

        if (!assignment) {
            console.log("Assignment 103 not found in this database.");
            // List all again to be sure
            const count = await prisma.assignment.count();
            console.log(`Total assignments in DB: ${count}`);

            console.log("Listing all assignments to help debug...");
            const allAssignments = await prisma.assignment.findMany();
            allAssignments.forEach(a => {
                console.log(`- ID: ${a.id}, ModelKey: "${a.modelKey}", Title: "${a.title}"`);
            });
            return;
        }

        console.log(`Found assignment 103: ${assignment.title}`);

        await prisma.validationLog.deleteMany({
            where: { assignmentId: 103 }
        });

        await prisma.assignment.delete({
            where: { id: 103 }
        });

        console.log("Successfully deleted Assignment 103.");

    } catch (e) {
        console.error("Error deleting assignment:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
