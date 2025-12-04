import prisma from "../config/prisma.js";

export const listUsersService = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teamId: true
    }
  });
};

