// backend/src/routes/expected.routes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { buildExpectedForModel } from "../services/expected.service.js";

const router = Router();

/**
 * GET /api/expected/:modelKey
 * Devuelve los textos esperados enriquecidos por cara.
 */
router.get("/:modelKey", auth, (req, res) => {
  const modelKey = String(req.params.modelKey || "").trim();
  if (!modelKey) return res.status(400).json({ ok: false, message: "Falta modelKey" });

  try {
    const expected = buildExpectedForModel(modelKey);
    const normalizedKey = modelKey.toUpperCase();

    // Guarda referencia para validación simulada (global, sin caras)
    // const requiredFields = (expected.globalRequirements || []).map((r) => ({
    //   field: r.requirement,
    //   required: r.type !== "VISUAL",
    // }));
    // db.requiredByModelKey[normalizedKey] = requiredFields;

    return res.json({
      ok: true,
      modelKey,
      meta: expected.meta,
      rawRow: expected.masterRow,
      requiredTexts: {
        ...expected,
        humanSummary: expected.resumenModelo,
        packaging: expected.packagingSuggestion,
      },
    });
  } catch (err) {
    const code = err.code === "NOT_FOUND" ? 404 : err.code === "NO_MASTER" ? 404 : 500;
    return res.status(code).json({
      ok: false,
      message: err.message || "No se pudo generar textos esperados",
      code: err.code || "ERROR",
    });
  }
});

export default router;
