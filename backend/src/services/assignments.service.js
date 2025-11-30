import prisma from "../config/prisma.js";

export const createAssignmentService = async ({ modelKey, title, description, createdById, projectType, deadline }) => {
  return prisma.assignment.create({
    data: { modelKey, title, description, createdById, projectType, deadline }
  });
};

export const delegateAssignmentService = async ({ assignmentIds, assigneeId }) => {
  // assignmentIds is array of numbers
  return prisma.assignment.updateMany({
    where: { id: { in: assignmentIds.map(Number) } },
    data: { assigneeId: Number(assigneeId), status: "IN_PROGRESS" }
  });
};

export const listMyAssignmentsService = async ({ userId, role }) => {
  if (role === "DESIGNER") {
    return prisma.assignment.findMany({
      where: { assigneeId: userId },
      orderBy: { createdAt: "desc" }
    });
  }
  if (role === "LEADER") {
    // Leader sees tasks they created OR all? 
    // Matching previous logic: createdById or all. 
    // Let's return all for now as per "filterByRole" returning all for non-designer in some contexts, 
    // but previous code had: if LEADER return createdById.
    // However, the user wants to see everything in the main dashboard usually.
    // Let's stick to: Leader sees what they created.
    return prisma.assignment.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: "desc" }
    });
  }
  // Admin sees all
  return prisma.assignment.findMany({ orderBy: { createdAt: "desc" } });
};

export const listAssignedService = async () => {
  return prisma.assignment.findMany({
    where: { assigneeId: { not: null } },
    orderBy: { updatedAt: "desc" }
  });
};

export const listRejectedService = async () => {
  return prisma.assignment.findMany({
    where: { status: "REJECTED" },
    orderBy: { updatedAt: "desc" }
  });
};

export const deleteAssignmentService = async (id) => {
  // Delete related reviews/validations/files first if cascade not set?
  // Prisma schema usually handles cascade if configured, but let's check schema.
  // Schema doesn't show onDelete: Cascade. So we might need to delete related first.
  // Or just try delete and see.
  // Let's delete related manually to be safe.
  await prisma.validationLog.deleteMany({ where: { assignmentId: id } });
  await prisma.review.deleteMany({ where: { assignmentId: id } });
  // Files might be tricky if we want to keep them or not.
  // Let's keep files for now or delete reference?
  // FileAsset has assignmentId.
  await prisma.fileAsset.updateMany({ where: { assignmentId: id }, data: { assignmentId: null } });

  return prisma.assignment.delete({ where: { id } });
};

export const submitAssignmentService = async ({ id, userId, overall }) => {
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) throw new Error("Tarea no encontrada");

  // Update assignment status
  const updated = await prisma.assignment.update({
    where: { id },
    data: { status: "REVIEW" }
  });

  // Create or Update Review
  // Check if pending review exists
  const existing = await prisma.review.findFirst({
    where: { assignmentId: id, leaderStatus: "PENDING" } // or just find any review for this assignment?
  });

  if (existing) {
    await prisma.review.update({
      where: { id: existing.id },
      data: {
        status: "SUBMITTED",
        iaStatus: overall || "PENDING",
        leaderStatus: "PENDING",
        submittedById: userId,
        details: JSON.stringify({ notes: "Re-enviado", status: "REVIEW" }) // simple string for now
      }
    });
  } else {
    await prisma.review.create({
      data: {
        assignmentId: id,
        modelKey: assignment.modelKey,
        status: "SUBMITTED",
        iaStatus: overall || "PENDING",
        leaderStatus: "PENDING",
        submittedById: userId,
        createdById: assignment.createdById,
        details: JSON.stringify({ notes: "Enviado a revisión", status: "REVIEW" })
      }
    });
  }
  return updated;
};

export const requestApprovalService = async ({ id, userId, overall }) => {
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) throw new Error("Tarea no encontrada");

  const updated = await prisma.assignment.update({
    where: { id },
    data: { status: "REVIEW_REQUESTED" }
  });

  const existing = await prisma.review.findFirst({ where: { assignmentId: id } });

  if (existing) {
    await prisma.review.update({
      where: { id: existing.id },
      data: {
        leaderStatus: "PENDING",
        iaStatus: overall || existing.iaStatus,
        submittedById: userId,
        details: JSON.stringify({ notes: "Solicitado por diseñador" })
      }
    });
  } else {
    await prisma.review.create({
      data: {
        assignmentId: id,
        modelKey: assignment.modelKey,
        status: "SUBMITTED",
        iaStatus: overall || "PENDING",
        leaderStatus: "PENDING",
        submittedById: userId,
        createdById: assignment.createdById,
        details: JSON.stringify({ notes: "Solicitado por diseñador" })
      }
    });
  }
  return updated;
};
