// backend/src/routes/metrics.routes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { getErrorMetricsService, getEfficiencyMetricsService, getHardestDesignsService, getDesignerMetricsService } from "../services/metrics.service.js";

const router = Router();

// GET /api/metrics/errors
router.get("/errors", auth, async (_req, res) => {
  try {
    const data = await getErrorMetricsService();
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/metrics/efficiency
router.get("/efficiency", auth, async (_req, res) => {
  try {
    const data = await getEfficiencyMetricsService();
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/metrics/hardest-designs
router.get("/hardest-designs", auth, async (_req, res) => {
  try {
    const data = await getHardestDesignsService();
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/metrics/designer/:id
router.get("/designer/:id", auth, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const data = await getDesignerMetricsService(userId);
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.use((_req, res) => res.status(404).json({ ok: false, message: "No encontrado /metrics" }));

export default router;
