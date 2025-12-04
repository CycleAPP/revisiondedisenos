import { ok, fail } from "../utils/response.js";
import * as service from "../services/assignments.service.js";

const PROJECT_MAPPING = {
  "Soriana": "Sodio",
  "Heb": "Helio",
  "Liverpool": "Litio",
  "Sears": "Selenio",
  "Calimax": "Calcio",
  "Chedraui": "Cesio",
  "La Comer": "Cobalto",
  "Coppel": "Cobre",
  "City Club": "Circon",
  "DSW": "Alexa",
  "3B": "3B"
};

export const createAssignment = async (req, res) => {
  try {
    const { retailer, deadline, packagingType, ...rest } = req.body;
    const projectType = (packagingType && packagingType.trim()) || PROJECT_MAPPING[retailer] || retailer;

    const payload = {
      ...rest,
      projectType,
      deadline: deadline ? new Date(deadline) : null,
      createdById: req.user.id
    };

    const a = await service.createAssignmentService(payload);
    return ok(res, a, 201);
  } catch (e) { return fail(res, e.message); }
};

export const delegateAssignment = async (req, res) => {
  try {
    const { assignmentId, assignmentIds, assigneeId } = req.body;
    // Handle both single and multiple
    const ids = assignmentIds || (assignmentId ? [assignmentId] : []);
    if (req.params.id) ids.push(req.params.id);

    const result = await service.delegateAssignmentService({ assignmentIds: ids, assigneeId });
    return ok(res, result);
  } catch (e) { return fail(res, e.message); }
};

export const listMyAssignments = async (req, res) => {
  try {
    const items = await service.listMyAssignmentsService({ userId: req.user.id, role: req.user.role });
    return ok(res, items);
  } catch (e) { return fail(res, e.message); }
};

export const listAssigned = async (req, res) => {
  try {
    const items = await service.listAssignedService();
    return ok(res, items);
  } catch (e) { return fail(res, e.message); }
};

export const listRejected = async (req, res) => {
  try {
    const items = await service.listRejectedService();
    return ok(res, items);
  } catch (e) { return fail(res, e.message); }
};

export const deleteAssignment = async (req, res) => {
  try {
    const result = await service.deleteAssignmentService(Number(req.params.id));
    return ok(res, result);
  } catch (e) { return fail(res, e.message); }
};

export const submitAssignment = async (req, res) => {
  try {
    const result = await service.submitAssignmentService({
      id: Number(req.params.id),
      userId: req.user.id,
      userRole: req.user.role,
      overall: req.body.overall
    });
    return ok(res, result);
  } catch (e) { return fail(res, e.message); }
};

export const requestApproval = async (req, res) => {
  try {
    const result = await service.requestApprovalService({
      id: Number(req.params.id),
      userId: req.user.id,
      userRole: req.user.role,
      overall: req.body.overall
    });
    return ok(res, result);
  } catch (e) { return fail(res, e.message); }
};
