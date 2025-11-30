// backend/src/utils/mountOrDummy.js
import express from "express";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

/**
 * Monta una ruta si existe; si no, regresa un router dummy que responde 501.
 *
 * IMPORTANTE:
 * - Usa process.cwd() para resolver rutas desde el directorio donde corres `node server.js`
 *   (en tu caso: .../diseno-empaque/backend)
 * - Evita usar r.all("*") porque Express 5 rompe con path-to-regexp v6.
 */
export default async function mountOrDummy(routePath) {
  try {
    // Normaliza: "./src/routes/xxx.js" -> "src/routes/xxx.js"
    const normalized = routePath.replace(/^\.\//, "");
    // Resuelve desde el CWD (backend/)
    const fullPath = path.resolve(process.cwd(), normalized);

    if (!fs.existsSync(fullPath)) {
      console.warn(`[AVISO] Ruta no encontrada: ${fullPath}`);
      return dummyRouter(routePath);
    }

    const mod = await import(pathToFileURL(fullPath).href);
    const router = mod?.default;

    if (!router || typeof router.use !== "function") {
      console.warn(`[AVISO] ${routePath} no exporta un Router válido (default).`);
      return dummyRouter(routePath);
    }

    console.log(`✅ Ruta cargada: ${routePath}`);
    return router;
  } catch (err) {
    console.warn(`[AVISO] ${routePath} no disponible.`, err);
    return dummyRouter(routePath);
  }
}

/**
 * Router fallback sin wildcard "*"
 * Express 5 + path-to-regexp v6: usar r.use((req,res)=>...)
 */
function dummyRouter(routePath) {
  const r = express.Router();
  r.use((req, res) => {
    res.status(501).json({
      ok: false,
      message: `Ruta no implementada: ${routePath}`,
    });
  });
  return r;
}
