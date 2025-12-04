import prisma from "../config/prisma.js";
import fs from "fs";
import path from "path";

export const listTemplatesService = async () => {
    return await prisma.template.findMany({
        orderBy: { createdAt: 'desc' },
        include: { uploadedBy: { select: { name: true } } }
    });
};

export const createTemplateService = async ({ name, type, filename, path: filePath, uploadedById }) => {
    return await prisma.template.create({
        data: {
            name,
            type,
            filename,
            path: filePath,
            uploadedById
        }
    });
};

export const deleteTemplateService = async (id) => {
    const template = await prisma.template.findUnique({ where: { id: Number(id) } });
    if (!template) throw new Error("Template not found");

    // Delete file from disk if exists
    try {
        const absolutePath = path.resolve(process.cwd(), template.path);
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }
    } catch (e) {
        console.error("Error deleting template file:", e);
    }

    return await prisma.template.delete({ where: { id: Number(id) } });
};

export const getTemplateByIdService = async (id) => {
    return await prisma.template.findUnique({ where: { id: Number(id) } });
};
