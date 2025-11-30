import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as controller from "../controllers/assignments.controller.js";

const router = Router();

// GET /api/assignments
router.get("/", auth, controller.listMyAssignments); // Reusing listMyAssignments as it filters by role

// GET /api/assignments/me
router.get("/me", auth, controller.listMyAssignments);

// GET /api/assignments/assigned (Leader/Admin)
router.get("/assigned", auth, (req, res, next) => {
  if (req.user.role !== "LEADER" && req.user.role !== "ADMIN") return res.status(403).json({ ok: false, message: "Forbidden" });
  next();
}, controller.listAssigned);

// GET /api/assignments/rejected (Leader/Admin)
router.get("/rejected", auth, (req, res, next) => {
  if (req.user.role !== "LEADER" && req.user.role !== "ADMIN") return res.status(403).json({ ok: false, message: "Forbidden" });
  next();
}, controller.listRejected);

// POST /api/assignments
router.post("/", auth, (req, res, next) => {
  if (req.user.role !== "LEADER" && req.user.role !== "ADMIN") return res.status(403).json({ ok: false, message: "Forbidden" });
  next();
}, controller.createAssignment);

// PUT /api/assignments/delegate
router.put("/delegate", auth, (req, res, next) => {
  if (req.user.role !== "LEADER" && req.user.role !== "ADMIN") return res.status(403).json({ ok: false, message: "Forbidden" });
  next();
}, controller.delegateAssignment);

// PUT /api/assignments/:id/delegate (Legacy)
router.put("/:id/delegate", auth, (req, res, next) => {
  if (req.user.role !== "LEADER" && req.user.role !== "ADMIN") return res.status(403).json({ ok: false, message: "Forbidden" });
  next();
}, controller.delegateAssignment);

// DELETE /api/assignments/:id
router.delete("/:id", auth, (req, res, next) => {
  if (req.user.role !== "LEADER" && req.user.role !== "ADMIN") return res.status(403).json({ ok: false, message: "Forbidden" });
  next();
}, controller.deleteAssignment);

// PUT /api/assignments/:id/submit
router.put("/:id/submit", auth, controller.submitAssignment);

// POST /api/assignments/:id/request-approval
router.post("/:id/request-approval", auth, controller.requestApproval);

router.use((_req, res) => res.status(404).json({ ok: false, message: "No encontrado /assignments" }));

export default router;
