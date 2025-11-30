import prisma from "../config/prisma.js";

export const listTeamsService = async () => {
  return prisma.team.findMany();
};
