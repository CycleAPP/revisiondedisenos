// backend/src/routes/teams.routes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { listTeamsService } from "../services/teams.service.js";

const router = Router();

router.get("/", auth, async (_req, res) => {
    try {
        const data = await listTeamsService();
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, message: e.message });
    }
});

router.use((_req, res) => res.status(404).json({ ok: false, message: "No encontrado /teams" }));

export default router;
