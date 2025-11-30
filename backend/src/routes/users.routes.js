import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { listUsersService, updateTimezoneService } from "../services/users.service.js";

const router = Router();

router.get("/", auth, async (_req, res) => {
  try {
    const users = await listUsersService();
    res.json({ ok: true, data: users });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.put("/:id/timezone", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { timezone } = req.body;
    await updateTimezoneService(id, timezone);
    return res.json({ ok: true, message: "Timezone updated" });
  } catch (e) {
    return res.status(404).json({ ok: false, message: "User not found or error updating" });
  }
});

router.use((_req, res) => res.status(404).json({ ok: false, message: "No encontrado /users" }));

export default router;
