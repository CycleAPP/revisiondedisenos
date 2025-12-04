import prisma from "../config/prisma.js";

export const createFileAssetService = async ({ modelKey, filename, originalName, path, url, type, uploadedById, assignmentId }) => {
    return prisma.fileRecord.create({
        data: {
            modelKey,
            path: url, // Store the web URL in 'path' column
            original: originalName || filename,
            type: type === "DESIGN" ? "DESIGN" : "EXCEL", // Ensure valid enum
            uploadedBy: uploadedById
        }
    });
};

export const listFilesByModelKeyService = async (modelKey) => {
    return prisma.fileRecord.findMany({
        where: { modelKey: { contains: modelKey, mode: 'insensitive' } },
        orderBy: { createdAt: "desc" }
    });
};

export const findFileByFilenameService = async (filename) => {
    return prisma.fileRecord.findFirst({
        where: {
            OR: [
                { original: filename },
                { path: { endsWith: filename } }
            ]
        }
    });
};

export const findLatestFileByModelKeyService = async (modelKey) => {
    return prisma.fileRecord.findFirst({
        where: { modelKey: { equals: modelKey, mode: 'insensitive' }, type: "DESIGN" },
        orderBy: { createdAt: "desc" }
    });
};
