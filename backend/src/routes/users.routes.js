import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { listUsersService, setRoleService, assignToTeamService, deleteUserService } from "../services/users.service.js";

const router = Router();

router.get("/", auth, async (_req, res) => {
  try {
    const users = await listUsersService();
    return res.json({ ok: true, data: users });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

router.post("/:id/role", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    await setRoleService(Number(id), role);
    return res.json({ ok: true, message: "Role updated" });
  } catch (err) {
    return res.status(400).json({ ok: false, message: err.message });
  }
});

router.post("/:id/team", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { teamId } = req.body;
    await assignToTeamService(Number(id), teamId ? Number(teamId) : null);
    return res.json({ ok: true, message: "Team assigned" });
  } catch (err) {
    return res.status(400).json({ ok: false, message: err.message });
  }
});

export default router;
