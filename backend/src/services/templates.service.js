// Note: Template model does not exist in the database schema
// These functions return empty/stub responses to prevent errors

export const listTemplatesService = async () => {
    return [];
};

export const createTemplateService = async ({ name, type, filename, originalName, uploadedById }) => {
    throw new Error("Template functionality not implemented - model does not exist in database");
};

export const deleteTemplateService = async (id) => {
    throw new Error("Template functionality not implemented - model does not exist in database");
};

export const getTemplateByIdService = async (id) => {
    return null;
};
