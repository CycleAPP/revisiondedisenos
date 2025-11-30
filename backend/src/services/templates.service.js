import prisma from "../config/prisma.js";

export const listTemplatesService = async () => {
    return prisma.template.findMany({
        orderBy: { createdAt: "desc" }
    });
};

export const createTemplateService = async ({ name, type, filename, originalName, uploadedById }) => {
    return prisma.template.create({
        data: {
            name,
            type,
            filename,
            originalName,
            uploadedById
        }
    });
};

export const deleteTemplateService = async (id) => {
    return prisma.template.delete({ where: { id } });
};

export const getTemplateByIdService = async (id) => {
    return prisma.template.findUnique({ where: { id } });
};
