import prisma from "../config/prisma.js";

export const createFileAssetService = async ({ modelKey, filename, path, url, type, uploadedById, assignmentId }) => {
    return prisma.fileAsset.create({
        data: {
            modelKey,
            filename,
            path,
            url,
            type: type || "OTHER",
            uploadedById,
            assignmentId
        }
    });
};

export const listFilesByModelKeyService = async (modelKey) => {
    return prisma.fileAsset.findMany({
        where: { modelKey: { contains: modelKey, mode: 'insensitive' } },
        orderBy: { createdAt: "desc" }
    });
};

export const findFileByFilenameService = async (filename) => {
    return prisma.fileAsset.findFirst({
        where: {
            OR: [
                { filename: filename },
                { path: { endsWith: filename } }
            ]
        }
    });
};

export const findLatestFileByModelKeyService = async (modelKey) => {
    return prisma.fileAsset.findFirst({
        where: { modelKey: { equals: modelKey, mode: 'insensitive' }, type: "DESIGN" },
        orderBy: { createdAt: "desc" }
    });
};
