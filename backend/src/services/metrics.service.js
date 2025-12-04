import prisma from "../config/prisma.js";

export const getErrorMetricsService = async () => {
    // Calculate error metrics from Assignments (REJECTED) and Validations (NOT_OK)
    const rejectedAssignments = await prisma.assignment.findMany({
        where: { status: "REJECTED" }
    });

    // Fix: Only count validations for existing assignments
    const activeAssignments = await prisma.assignment.findMany({ select: { modelKey: true } });
    const activeModelKeys = activeAssignments.map(a => a.modelKey).filter(Boolean);

    const failedValidations = await prisma.validation.findMany({
        where: {
            status: "NOT_OK",
            modelKey: { in: activeModelKeys }
        }
    });

    const errorCounters = {};

    // Leader Rejections
    if (rejectedAssignments.length > 0) {
        errorCounters["Rechazo por Líder"] = rejectedAssignments.length;
    }

    // AI Errors
    failedValidations.forEach(v => {
        if (v.details) {
            try {
                const details = JSON.parse(v.details);
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
    // Fetch assignments completed (APPROVED or DONE)
    // Actually, if we use DONE for "Submitted", we should check APPROVED for "Fully Completed"
    // But let's check both for now or just APPROVED if that's the final state.
    // In review.service.js we set status to APPROVED.
    const assignments = await prisma.assignment.findMany({
        where: { status: "APPROVED" }, // Only count approved tasks
        include: { assignee: true }
    });

    const efficiency = {};

    assignments.forEach(a => {
        if (!a.assigneeId) return;
        const userId = a.assigneeId;

        if (!efficiency[userId]) {
            efficiency[userId] = { repairedTimeMsAcum: 0, tasksDone: 0, lastCalcAt: Date.now() };
        }

        // We need start time. CreatedAt is start.
        // CompletedAt is not in schema?
        // Wait, schema has updatedAt.
        // If we don't have completedAt, we use updatedAt.
        const start = new Date(a.createdAt);
        const end = new Date(a.updatedAt);
        const duration = end - start;

        efficiency[userId].repairedTimeMsAcum += duration;
        efficiency[userId].tasksDone++;
    });

    return efficiency;
};

export const getHardestDesignsService = async () => {
    // Count fails per modelKey (REJECTED assignments)
    const rejected = await prisma.assignment.findMany({
        where: { status: "REJECTED" }
    });

    const counts = {};
    rejected.forEach(a => {
        if (a.modelKey) {
            counts[a.modelKey] = (counts[a.modelKey] || 0) + 1;
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
        if (a.status === 'APPROVED') metrics.completed++;
        else if (['IN_PROGRESS', 'PENDING', 'DONE', 'REJECTED'].includes(a.status)) metrics.pending++;

        // projectType was removed from schema, using modelKey prefix as proxy or 'General'
        const type = a.modelKey ? a.modelKey.split('-')[0] : 'General';
        metrics.byProject[type] = (metrics.byProject[type] || 0) + 1;

        if (a.status === 'APPROVED') {
            const start = new Date(a.createdAt);
            const end = new Date(a.updatedAt);
            totalTimeMs += (end - start);
            completedCount++;
        }
    }

    if (completedCount > 0) {
        metrics.avgTimeHours = (totalTimeMs / completedCount) / (1000 * 60 * 60);
    }

    // Errors (Rejected assignments)
    const rejected = assignments.filter(a => a.status === 'REJECTED');
    if (rejected.length > 0) {
        metrics.errors['Rechazo por Líder'] = rejected.length;
    }

    // AI Errors for these assignments (via Validation)
    // We need to fetch validations for these assignments' modelKeys
    const modelKeys = assignments.map(a => a.modelKey).filter(Boolean);
    if (modelKeys.length > 0) {
        const validations = await prisma.validation.findMany({
            where: {
                modelKey: { in: modelKeys },
                status: "NOT_OK"
            }
        });

        validations.forEach(v => {
            if (v.details) {
                try {
                    const details = JSON.parse(v.details);
                    if (details.missing && Array.isArray(details.missing)) {
                        details.missing.forEach(missingField => {
                            metrics.errors[missingField] = (metrics.errors[missingField] || 0) + 1;
                        });
                    }
                } catch (e) { /* ignore */ }
            }
        });
    }

    return metrics;
};
