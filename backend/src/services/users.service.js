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

export const setRoleService = async (id, role) => {
  return prisma.user.update({
    where: { id },
    data: { role }
  });
};

export const assignToTeamService = async (id, teamId) => {
  return prisma.user.update({
    where: { id },
    data: { teamId }
  });
};

export const getUserMetricsService = async (id) => {
  const assignments = await prisma.assignment.findMany({
    where: { assigneeId: Number(id) }
  });

  return {
    total: assignments.length,
    completed: assignments.filter(a => a.status === 'APPROVED').length,
    pending: assignments.filter(a => ['PENDING', 'IN_PROGRESS', 'DONE'].includes(a.status)).length,
    rejected: assignments.filter(a => a.status === 'REJECTED').length
  };
};

