import prisma from "./src/config/prisma.js";

async function findFailed() {
    const failed = await prisma.validation.findMany({
        where: {
            OR: [
                { status: "REJECTED" },
                { status: "FAIL" },
                { status: "ERROR" }
            ]
        }
    });
    console.log("Failed Validations:", JSON.stringify(failed, null, 2));
}

findFailed()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
