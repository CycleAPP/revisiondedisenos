import prisma from "../config/prisma.js";

export const listReviewsService = async ({ userId, role }) => {
    let where = {
        status: { in: ["DONE", "APPROVED", "REJECTED"] }
    };

    if (role === "LEADER") {
        where.createdById = userId;
    } else if (role === "DESIGNER") {
        where.assigneeId = userId;
    }

    const assignments = await prisma.assignment.findMany({
        where,
        include: {
            assignee: true,
            createdBy: true
        },
        orderBy: { updatedAt: "desc" }
    });

    // Enrich with Validation details and latest file
    const enriched = await Promise.all(assignments.map(async (a) => {
        // Find latest file for this modelKey
        let file = await prisma.fileRecord.findFirst({
            where: { modelKey: { equals: a.modelKey, mode: 'insensitive' }, type: "DESIGN" },
            orderBy: { createdAt: "desc" }
        });

        // Find validation
        let validation = await prisma.validation.findFirst({
            where: { modelKey: a.modelKey }
        });

        return {
            id: a.id, // Use assignment ID as review ID
            assignmentId: a.id,
            modelKey: a.modelKey,
            status: a.status,
            leaderStatus: a.status === "APPROVED" ? "APPROVED" : (a.status === "REJECTED" ? "REJECTED" : "PENDING"),
            iaStatus: validation ? validation.status : "PENDING",
            designerName: a.assignee?.name || "Desconocido",
            designerEmail: a.assignee?.email || "",
            fileUrl: file ? file.path : null,
            fileName: file ? file.original : null,
            details: validation && validation.details ? JSON.parse(validation.details) : {},
            createdAt: a.createdAt,
            updatedAt: a.updatedAt
        };
    }));

    return enriched;
};

import { sendEmail } from "./email.service.js";

export const updateReviewStatusService = async ({ id, status, notes, leaderId }) => {
    // status is 'APPROVED' or 'REJECTED'
    // id is assignmentId now
    const assignment = await prisma.assignment.findUnique({ where: { id }, include: { assignee: true } });
    if (!assignment) throw new Error("Tarea no encontrada");

    const newStatus = status === "APPROVED" ? "APPROVED" : "REJECTED";

    const updated = await prisma.assignment.update({
        where: { id },
        data: {
            status: newStatus,
            updatedAt: new Date()
        }
    });

    // Update Validation details with notes if possible
    if (assignment.modelKey) {
        const validation = await prisma.validation.findFirst({ where: { modelKey: assignment.modelKey } });
        if (validation) {
            // Append notes to details
            let details = {};
            try { details = JSON.parse(validation.details); } catch (e) { }
            details.leaderNotes = notes;

            await prisma.validation.update({
                where: { id: validation.id },
                data: { details: JSON.stringify(details) }
            });
        }
    }

    // Notify Designer
    try {
        if (assignment.assignee && assignment.assignee.email) {
            const subject = status === "APPROVED" ? "Diseño Aprobado ✅" : "Diseño Rechazado ❌";
            const color = status === "APPROVED" ? "green" : "red";
            await sendEmail({
                to: assignment.assignee.email,
                subject: `${subject} - ${assignment.modelKey}`,
                html: `<p>Hola ${assignment.assignee.name},</p>
                       <p>Tu diseño para <strong>${assignment.modelKey}</strong> ha sido <span style="color:${color};font-weight:bold">${status}</span>.</p>
                       ${notes ? `<p><strong>Notas:</strong> ${notes}</p>` : ""}
                       <p>Ingresa a la plataforma para más detalles.</p>`
            });
        }
    } catch (e) { console.error("Error sending email:", e); }

    return updated;
};
