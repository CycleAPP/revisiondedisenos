import prisma from "../config/prisma.js";

export const listReviewsService = async ({ userId, role }) => {
    let where = {};

    if (role === "LEADER") {
        // Leader sees reviews for tasks they created? Or all?
        // Previous code: if LEADER, filter by assignment.createdById === userId
        // Let's try to match that.
        where = {
            assignment: {
                createdById: userId
            }
        };
    } else if (role === "DESIGNER") {
        where = {
            submittedById: userId
        };
    }
    // Admin sees all (empty where)

    const reviews = await prisma.review.findMany({
        where,
        include: {
            assignment: true,
            submittedBy: true
        },
        orderBy: { updatedAt: "desc" }
    });

    // Enrich with latest file
    // We need to fetch files for these reviews.
    // We can do it in parallel or N+1 (bad but simple for now).
    // Better: fetch all relevant files.

    const enriched = await Promise.all(reviews.map(async (r) => {
        // Find latest file for this assignment or modelKey
        // FileAsset has assignmentId, prefer that.
        let file = await prisma.fileAsset.findFirst({
            where: { assignmentId: r.assignmentId, type: "DESIGN" },
            orderBy: { createdAt: "desc" }
        });

        if (!file && r.modelKey) {
            // Fallback by modelKey
            file = await prisma.fileAsset.findFirst({
                where: { modelKey: r.modelKey, type: "DESIGN" },
                orderBy: { createdAt: "desc" }
            });
        }

        return {
            ...r,
            designerName: r.submittedBy?.name || "Desconocido",
            designerEmail: r.submittedBy?.email || "",
            fileUrl: file ? file.url : r.fileUrl, // Use file asset url or fallback to review's fileUrl if set
            fileName: file ? file.filename : r.fileName,
            details: r.details ? JSON.parse(r.details) : {}
        };
    }));

    return enriched;
};

export const updateReviewStatusService = async ({ id, status, notes, leaderId }) => {
    // status is 'APPROVED' or 'REJECTED'
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new Error("Review no encontrada");

    const updatedReview = await prisma.review.update({
        where: { id },
        data: {
            leaderStatus: status,
            notes, // We can store notes in 'notes' field or inside 'details' JSON. Schema has 'notes' String?
            // Schema has `notes String?`. Previous code used `leaderNotes` and `details`.
            // Let's use `notes` field for leader notes.
            updatedAt: new Date()
        }
    });

    // Update Assignment status
    if (status === "APPROVED") {
        await prisma.assignment.update({
            where: { id: review.assignmentId },
            data: { status: "DONE", completedAt: new Date() }
        });
    } else if (status === "REJECTED") {
        await prisma.assignment.update({
            where: { id: review.assignmentId },
            data: { status: "IN_PROGRESS" } // Back to progress
        });
    }

    return updatedReview;
};
