import dotenv from "dotenv";
dotenv.config();
import prisma from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/hash.js";

const run = async () => {
    console.log("🌱 Resetting database with fresh users...\n");

    // Delete all existing data in proper order (respecting foreign keys)
    console.log("🗑️  Cleaning existing data...");
    await prisma.chatMessage.deleteMany({});
    await prisma.chatThread.deleteMany({});
    await prisma.validationLog.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.fileAsset.deleteMany({});
    await prisma.template.deleteMany({});
    await prisma.assignment.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.team.deleteMany({});
    console.log("✅ Database cleaned\n");

    // Hash passwords
    console.log("🔐 Hashing passwords...");
    const adminPass = await hashPassword("admin123");
    const leaderPass = await hashPassword("leader123");
    const designerPass = await hashPassword("designer123");
    console.log("✅ Passwords hashed\n");

    // Create team
    console.log("👥 Creating team...");
    const team = await prisma.team.create({
        data: { name: "Equipo Principal" }
    });
    console.log(`✅ Team created: ${team.name}\n`);

    // Create users
    console.log("👤 Creating users...");

    const admin = await prisma.user.create({
        data: {
            email: "admin@demo.com",
            name: "Administrador",
            password: adminPass,
            role: "ADMIN"
        }
    });
    console.log(`   ✅ Admin: ${admin.email} (password: admin123)`);

    const leader = await prisma.user.create({
        data: {
            email: "leader@demo.com",
            name: "Líder de Equipo",
            password: leaderPass,
            role: "LEADER",
            teamId: team.id
        }
    });
    console.log(`   ✅ Leader: ${leader.email} (password: leader123)`);

    const designer = await prisma.user.create({
        data: {
            email: "designer@demo.com",
            name: "Diseñador",
            password: designerPass,
            role: "DESIGNER",
            teamId: team.id
        }
    });
    console.log(`   ✅ Designer: ${designer.email} (password: designer123)`);

    // Create a sample assignment
    console.log("\n📋 Creating sample assignment...");
    const assignment = await prisma.assignment.create({
        data: {
            modelKey: "X01",
            title: "Diseño de prueba X01",
            description: "Este es un diseño de ejemplo para probar la validación OCR",
            status: "NEW",
            projectType: "Full Color Box",
            createdById: leader.id,
            assigneeId: designer.id
        }
    });
    console.log(`   ✅ Assignment: ${assignment.title} (ID: ${assignment.id})\n`);

    console.log("========================================");
    console.log("🎉 DATABASE RESET COMPLETE!");
    console.log("========================================");
    console.log("\nCredenciales de acceso:");
    console.log("------------------------");
    console.log("ADMIN:    admin@demo.com    / admin123");
    console.log("LEADER:   leader@demo.com   / leader123");
    console.log("DESIGNER: designer@demo.com / designer123");
    console.log("========================================\n");

    await prisma.$disconnect();
    process.exit(0);
};

run().catch(e => {
    console.error("❌ Error:", e);
    process.exit(1);
});
