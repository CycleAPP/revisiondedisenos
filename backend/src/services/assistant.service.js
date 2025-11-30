import prisma from "../config/prisma.js";

export const getThreadService = async (threadId) => {
    return prisma.chatThread.findUnique({
        where: { id: threadId },
        include: { messages: { orderBy: { createdAt: "asc" } } }
    });
};

export const createThreadService = async (userId) => {
    return prisma.chatThread.create({
        data: { userId }
    });
};

export const addMessageService = async ({ threadId, role, content, imageUrl }) => {
    // Ensure thread exists
    let thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) {
        // If threadId provided but not found, create it? 
        // Or throw error? The frontend might send a generated UUID.
        // Prisma needs UUID.
        thread = await prisma.chatThread.create({
            data: { id: threadId }
        });
    }

    return prisma.chatMessage.create({
        data: {
            threadId,
            role: role.toUpperCase(), // USER, ASSISTANT, SYSTEM
            content,
            imageUrl
        }
    });
};

export const clearThreadService = async (threadId) => {
    await prisma.chatMessage.deleteMany({ where: { threadId } });
    return prisma.chatThread.delete({ where: { id: threadId } });
};
