
import prisma from "../src/config/prisma.js";

async function main() {
    try {
        const users = await prisma.user.findMany();
        console.log("Found", users.length, "users:");
        users.forEach(u => {
            console.log(`- ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Password (Hash): ${u.password}`);
        });
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
