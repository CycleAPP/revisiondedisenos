import prisma from "../config/prisma.js";

export const getErrorMetricsService = async () => {
    // Calculate error metrics from Reviews
    // This is complex to aggregate in SQL if details is JSON.
    // We'll fetch reviews and aggregate in JS for now, similar to original code.
    const reviews = await prisma.review.findMany({
        where: { OR: [{ status: { not: "OK" } }, { leaderStatus: "REJECTED" }] }
    });

    const errorCounters = {};

    reviews.forEach(r => {
        // Leader Rejections
        if (r.leaderStatus === "REJECTED") {
            errorCounters["Rechazo por Líder"] = (errorCounters["Rechazo por Líder"] || 0) + 1;
        }

        // AI Errors (if stored in details)
        if (r.details) {
            try {
                const details = JSON.parse(r.details);
                if (details.missing && Array.isArray(details.missing)) {
                    details.missing.forEach(missingField => {
                        errorCounters[missingField] = (errorCounters[missingField] || 0) + 1;
                    });
                }
            } catch (e) { /* ignore */ }
        }
    });

    return errorCounters;
};

export const getEfficiencyMetricsService = async () => {
    // Efficiency by user
    // Fetch assignments completed
    const assignments = await prisma.assignment.findMany({
        where: { status: "DONE", completedAt: { not: null } },
        include: { assignee: true }
    });

    const efficiency = {};

    assignments.forEach(a => {
        if (!a.assigneeId) return;
        const userId = a.assigneeId;

        if (!efficiency[userId]) {
            efficiency[userId] = { repairedTimeMsAcum: 0, tasksDone: 0, lastCalcAt: Date.now() };
        }

        const start = new Date(a.createdAt);
        const end = new Date(a.completedAt);
        const duration = end - start;

        efficiency[userId].repairedTimeMsAcum += duration;
        efficiency[userId].tasksDone++;
    });

    return efficiency;
};

export const getHardestDesignsService = async () => {
    // Count fails per modelKey
    const reviews = await prisma.review.findMany({
        where: { OR: [{ status: { not: "OK" } }, { leaderStatus: "REJECTED" }] }
    });

    const counts = {};
    reviews.forEach(r => {
        if (r.modelKey) {
            counts[r.modelKey] = (counts[r.modelKey] || 0) + 1;
        }
    });

    return Object.entries(counts)
        .map(([modelKey, fails]) => ({ modelKey, fails }))
        .sort((a, b) => b.fails - a.fails);
};

export const getDesignerMetricsService = async (userId) => {
    const assignments = await prisma.assignment.findMany({
        where: { assigneeId: userId }
    });

    const metrics = {
        total: assignments.length,
        completed: 0,
        pending: 0,
        byProject: {},
        avgTimeHours: 0,
        errors: {}
    };

    let totalTimeMs = 0;
    let completedCount = 0;

    for (const a of assignments) {
        if (a.status === 'DONE') metrics.completed++;
        else if (['IN_PROGRESS', 'REVIEW', 'REVIEW_REQUESTED', 'NEW', 'REJECTED'].includes(a.status)) metrics.pending++;

        const type = a.projectType || 'Unknown';
        metrics.byProject[type] = (metrics.byProject[type] || 0) + 1;

        if (a.completedAt && a.createdAt) {
            const start = new Date(a.createdAt);
            const end = new Date(a.completedAt);
            totalTimeMs += (end - start);
            completedCount++;
        }
    }

    if (completedCount > 0) {
        metrics.avgTimeHours = (totalTimeMs / completedCount) / (1000 * 60 * 60);
    }

    // Errors
    const reviews = await prisma.review.findMany({
        where: {
            assignment: { assigneeId: userId },
            OR: [{ status: { not: "OK" } }, { leaderStatus: "REJECTED" }]
        }
    });

    reviews.forEach(r => {
        if (r.leaderStatus === 'REJECTED') {
            metrics.errors['Rechazo por Líder'] = (metrics.errors['Rechazo por Líder'] || 0) + 1;
        }
        if (r.details) {
            try {
                const details = JSON.parse(r.details);
                if (details.missing && Array.isArray(details.missing)) {
                    details.missing.forEach(missingField => {
                        metrics.errors[missingField] = (metrics.errors[missingField] || 0) + 1;
                    });
                }
                if (r.leaderNotes) {
                    metrics.errors[r.leaderNotes] = (metrics.errors[r.leaderNotes] || 0) + 1;
                }
            } catch (e) { /* ignore */ }
        }
    });

    return metrics;
};
