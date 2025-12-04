import { ok, fail } from "../utils/response.js";
import { listUsers as listUsersService, setRoleService, assignToTeamService, getUserMetricsService } from "../services/users.service.js";

export const getMetrics = async (req, res) => {
  try {
    const userId = req.params.id || req.user.id;
    const metrics = await getUserMetricsService(userId);
    return ok(res, metrics);
  } catch (e) { return fail(res, e.message); }
};

export const list = async (_req, res) => {
  const users = await listUsersService();
  return ok(res, users);
};

export const setRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body; // "ADMIN" | "LEADER" | "DESIGNER"
    const u = await setRoleService(userId, role);
    return ok(res, { id: u.id, role: u.role });
  } catch (e) { return fail(res, e.message); }
};

export const assignToTeam = async (req, res) => {
  try {
    const { userId } = req.params;
    const { teamId } = req.body;
    const u = await assignToTeamService(userId, teamId);
    return ok(res, { id: u.id, teamId: u.teamId });
  } catch (e) { return fail(res, e.message); }
};
