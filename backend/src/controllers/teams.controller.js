import { ok, fail } from "../utils/response.js";
import { createTeamService, addMemberService, listTeamsService } from "../services/teams.service.js";

export const createTeam = async (req, res) => {
  try { const t = await createTeamService(req.body); return ok(res, t, 201); }
  catch (e) { return fail(res, e.message); }
};

export const addMember = async (req, res) => {
  try { const m = await addMemberService({ teamId: req.params.teamId, userId: req.body.userId }); return ok(res, m); }
  catch (e) { return fail(res, e.message); }
};

export const listTeams = async (_req, res) => {
  const data = await listTeamsService(); return ok(res, data);
};
