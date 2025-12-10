import prisma from "../config/prisma.js";

export const createAssignmentService = async ({ modelKey, title, description, createdById }) => {
  return prisma.assignment.create({
    data: { modelKey, title, description, createdById }
  });
};

import { sendEmail } from "./email.service.js";
import { getEmailTemplate } from "../utils/emailTemplates.js";

export const delegateAssignmentService = async ({ assignmentIds, assigneeId }) => {
  // assignmentIds is array of numbers
  const updated = await prisma.assignment.updateMany({
    where: { id: { in: assignmentIds.map(Number) } },
    data: { assigneeId: Number(assigneeId), status: "IN_PROGRESS" }
  });

  // Notify Assignee
  try {
    const assignee = await prisma.user.findUnique({ where: { id: Number(assigneeId) } });
    if (assignee && assignee.email) {
      // Fetch assignment details for the email
      const assignments = await prisma.assignment.findMany({
        where: { id: { in: assignmentIds.map(Number) } },
        select: { modelKey: true, title: true }
      });

      const items = assignments.map(a => `<strong>${a.modelKey}</strong>: ${a.title}`);
      const html = getEmailTemplate({
        title: "¡Tienes nuevas tareas asignadas!",
        message: `<p>Hola <strong>${assignee.name}</strong>,</p><p>Se te han asignado <strong>${assignments.length}</strong> nuevas tareas para trabajar.</p>`,
        items,
        actionLink: "https://designlumina.ciklo.me/",
        actionText: "Ir al Dashboard"
      });

      sendEmail({
        to: assignee.email,
        subject: `Nueva Asignación (${assignments.length} tareas) - Diseño Empaque`,
        html
      }).catch(e => console.error("Error sending email:", e));
    }
  } catch (e) { console.error("Error preparing email:", e); }

  return updated;
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
  // Delete related validations
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (assignment && assignment.modelKey) {
    await prisma.validation.deleteMany({ where: { modelKey: assignment.modelKey } });
  }

  // FileRecord has uploadedBy (User), not assignmentId directly in schema? 
  // Wait, schema for FileRecord:
  // model FileRecord { ... uploadedBy Int ... }
  // It does NOT have assignmentId in the schema I saw!
  // So we can't delete by assignmentId.
  // We can delete by modelKey if we want, but maybe unsafe.
  // Let's just delete the assignment.

  return prisma.assignment.delete({ where: { id } });
};

export const submitAssignmentService = async ({ id, userId, overall, userRole }) => {
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) throw new Error("Tarea no encontrada");

  if (userRole === "DESIGNER" && assignment.assigneeId !== userId) {
    throw new Error("No tienes permiso para entregar esta tarea.");
  }

  // Update assignment status to DONE (meaning "Submitted for Review")
  const updated = await prisma.assignment.update({
    where: { id },
    data: { status: "DONE" }
  });

  // Update Validation if exists, or create
  // We use Validation to store the "AI Status" (overall)
  if (assignment.modelKey) {
    const existing = await prisma.validation.findFirst({ where: { modelKey: assignment.modelKey } });
    if (existing) {
      await prisma.validation.update({
        where: { id: existing.id },
        data: { status: overall || "PENDING", details: JSON.stringify({ notes: "Re-enviado" }) }
      });
    } else {
      await prisma.validation.create({
        data: {
          modelKey: assignment.modelKey,
          status: overall || "PENDING",
          details: JSON.stringify({ notes: "Enviado a revisión" })
        }
      });
    }
  }

  return updated;
};

export const requestApprovalService = async ({ id, userId, overall, userRole }) => {
  return submitAssignmentService({ id, userId, overall, userRole });
};
