import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { listReviewsService, updateReviewStatusService } from "../services/review.service.js";

const router = Router();

// GET /api/review
router.get("/", auth, async (req, res) => {
  try {
    const data = await listReviewsService({ userId: req.user.id, role: req.user.role });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/review/:id/approve
router.put("/:id/approve", auth, async (req, res) => {
  if (!["LEADER", "ADMIN"].includes(req.user?.role)) {
    return res.status(403).json({ ok: false, message: "Solo líder o admin" });
  }
  try {
    const result = await updateReviewStatusService({
      id: Number(req.params.id),
      status: "APPROVED",
      notes: req.body.notes,
      leaderId: req.user.id
    });
    return res.json({ ok: true, data: result });
  } catch (e) {
    return res.status(404).json({ ok: false, message: e.message });
  }
});

// Alias: leader-approve
router.put("/:id/leader-approve", auth, async (req, res) => {
  if (!["LEADER", "ADMIN"].includes(req.user?.role)) {
    return res.status(403).json({ ok: false, message: "Solo líder o admin" });
  }
  try {
    const result = await updateReviewStatusService({
      id: Number(req.params.id),
      status: "APPROVED",
      notes: req.body.notes,
      leaderId: req.user.id
    });
    return res.json({ ok: true, data: result });
  } catch (e) {
    return res.status(404).json({ ok: false, message: e.message });
  }
});

// PUT /api/review/:id/reject
router.put("/:id/reject", auth, async (req, res) => {
  if (!["LEADER", "ADMIN"].includes(req.user?.role)) {
    return res.status(403).json({ ok: false, message: "Solo líder o admin" });
  }
  try {
    const result = await updateReviewStatusService({
      id: Number(req.params.id),
      status: "REJECTED",
      notes: req.body.notes,
      leaderId: req.user.id
    });
    return res.json({ ok: true, data: result });
  } catch (e) {
    return res.status(404).json({ ok: false, message: e.message });
  }
});

// Alias: leader-reject
router.put("/:id/leader-reject", auth, async (req, res) => {
  if (!["LEADER", "ADMIN"].includes(req.user?.role)) {
    return res.status(403).json({ ok: false, message: "Solo líder o admin" });
  }
  try {
    const result = await updateReviewStatusService({
      id: Number(req.params.id),
      status: "REJECTED",
      notes: req.body.notes,
      leaderId: req.user.id
    });
    return res.json({ ok: true, data: result });
  } catch (e) {
    return res.status(404).json({ ok: false, message: e.message });
  }
});

router.use((_req, res) => res.status(404).json({ ok: false, message: "No encontrado" }));

export default router;
