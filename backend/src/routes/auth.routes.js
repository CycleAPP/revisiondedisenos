import { Router } from "express";
import { loginService, registerService } from "../services/auth.service.js";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, message: "Faltan credenciales" });

    const data = await loginService({ email, password });
    return res.json({ ok: true, data });
  } catch (e) {
    return res.status(401).json({ ok: false, message: e.message });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, teamId } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ ok: false, message: "Faltan campos" });

    const user = await registerService({ name, email, password, role, teamId });
    return res.json({ ok: true, data: { user } });
  } catch (e) {
    return res.status(409).json({ ok: false, message: e.message });
  }
});

router.use((_req, res) => res.status(404).json({ ok: false, message: "No encontrado /auth" }));

export default router;
