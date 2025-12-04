import prisma from "./src/config/prisma.js";

async function listStatuses() {
    const all = await prisma.validation.findMany({
        select: { id: true, modelKey: true, status: true }
    });
    console.log("All Validations:", JSON.stringify(all, null, 2));
}

listStatuses()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
