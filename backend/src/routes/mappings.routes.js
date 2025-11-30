// backend/src/routes/mappings.routes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.js";

const router = Router();

router.get("/", auth, (_req, res) => {
  res.json({ ok: true, data: [{ key: "Nombre Producto", ocrKey: "product_name" }] });
});

router.use((_req, res) => res.status(404).json({ ok: false, message: "No encontrado /mappings" }));

export default router;
