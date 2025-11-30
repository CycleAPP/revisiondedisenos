import prisma from "../config/prisma.js";

export const listUsersService = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teamId: true,
      timezone: true
    }
  });
};

export const updateTimezoneService = async (id, timezone) => {
  return prisma.user.update({
    where: { id },
    data: { timezone }
  });
};
