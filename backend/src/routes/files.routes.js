// backend/src/routes/files.routes.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";
import prisma from "../config/prisma.js";
import { auth } from "../middlewares/auth.js";
import { createFileAssetService, listFilesByModelKeyService } from "../services/files.service.js";

const router = Router();

// ----------------- paths básicos -----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

// ----------------- Multer -----------------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const stamp = Date.now();
    cb(null, `${base}_${stamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB para PDFs/imagenes grandes
  },
});

// ----------------- Cache en memoria (Excel) -----------------
let lastExcelMeta = null;
let lastExcelRows = [];

// Helper: leer XLSX en modo ESM
function readWorkbook(filePath) {
  const buf = fs.readFileSync(filePath);
  return XLSX.read(buf, { type: "buffer" });
}

/**
 * POST /api/files/upload-excel
 * Sube el Excel base (Master_Season_diseño.xlsx, etc.)
 */
router.post(
  "/upload-excel",
  auth,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, message: "Falta archivo" });
      }

      const { modelKey } = req.body;

      let workbook;
      try {
        workbook = readWorkbook(req.file.path);
      } catch (err) {
        throw new Error("No se pudo leer el archivo Excel. Asegúrate de que sea un formato válido (.xlsx, .xls).");
      }

      if (!workbook.SheetNames || !workbook.SheetNames.length) {
        throw new Error("El archivo Excel no tiene hojas visibles.");
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) throw new Error(`La hoja '${sheetName}' está vacía o corrupta.`);

      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (!rows || !rows.length) throw new Error("La hoja de Excel no contiene filas de datos.");

      lastExcelMeta = {
        storedFilename: req.file.filename,
        originalName: req.file.originalname,
        sheetName,
        uploadedAt: new Date().toISOString()
      };
      lastExcelRows = rows;

      // 🔥 NUEVO: guardar tabla en JSON para otras rutas (expected)
      const jsonPath = path.join(uploadsDir, "master_design_table.json");
      fs.writeFileSync(
        jsonPath,
        JSON.stringify({ meta: lastExcelMeta, rows }, null, 2),
        "utf8"
      );

      let matchedRow = null;
      if (modelKey) {
        const key = String(modelKey).trim().toLowerCase();
        matchedRow = rows.find(r =>
          Object.values(r).some(v => String(v).trim().toLowerCase() === key)
        ) || null;
      }

      return res.json({
        ok: true,
        message: "Excel cargado y parseado",
        meta: lastExcelMeta,
        rows: rows.length,
        modelKey,
        hasMatch: !!matchedRow,
        sampleRow: matchedRow || rows[0] || null
      });
    } catch (err) {
      console.error("Error en /api/files/upload-excel:", err);
      return res.status(500).json({
        ok: false,
        message: "Error procesando Excel",
        error: String(err?.message || err)
      });
    }
  }
);

/**
 * GET /api/files/excel-row/:modelKey
 * Devuelve la fila del Excel master que matchea con el modelo
 */
router.get("/excel-row/:modelKey", auth, (req, res) => {
  if (!lastExcelRows.length) {
    // Try to load from json if exists
    try {
      const jsonPath = path.join(uploadsDir, "master_design_table.json");
      if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        lastExcelRows = data.rows || [];
        lastExcelMeta = data.meta || null;
      }
    } catch (e) { /* ignore */ }
  }

  if (!lastExcelRows.length) {
    return res.status(404).json({
      ok: false,
      message: "No hay Excel cargado aún"
    });
  }

  const key = req.params.modelKey.trim().toLowerCase();
  const row = lastExcelRows.find(r =>
    Object.values(r).some(v => String(v).trim().toLowerCase() === key)
  );

  if (!row) {
    return res.status(404).json({
      ok: false,
      message: `No se encontró fila para modelo ${req.params.modelKey}`
    });
  }

  return res.json({
    ok: true,
    meta: lastExcelMeta,
    row
  });
});

/**
 * POST /api/files/upload-design
 * Sube el PDF/imagen del diseño del SKU
 */
router.post(
  "/upload-design",
  auth,
  upload.single("file"),
  async (req, res) => {
    try {
      const { modelKey } = req.body;
      if (!modelKey) {
        return res.status(400).json({ ok: false, message: "Falta modelKey" });
      }
      if (!req.file) {
        return res.status(400).json({ ok: false, message: "Falta archivo" });
      }

      // Validation: File Type
      const ext = path.extname(req.file.originalname).toLowerCase();
      const allowed = [".pdf", ".ai", ".png", ".jpg", ".jpeg", ".zip", ".rar", ".7z"];
      if (!allowed.includes(ext)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ ok: false, message: "Tipo de archivo no permitido." });
      }

      // Security: Check Assignment for Designers
      if (req.user.role === "DESIGNER") {
        const assignment = await prisma.assignment.findFirst({
          where: { modelKey: String(modelKey), assigneeId: req.user.id }
        });
        if (!assignment) {
          fs.unlinkSync(req.file.path);
          return res.status(403).json({ ok: false, message: "No tienes permiso para subir archivos a este modelo." });
        }
      }

      const url = `/uploads/${req.file.filename}`;

      // Save to DB
      const asset = await createFileAssetService({
        modelKey: String(modelKey).toUpperCase(),
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        url,
        type: "DESIGN",
        uploadedById: req.user.id
      });

      return res.json({
        ok: true,
        message: "Diseño subido",
        data: asset
      });
    } catch (err) {
      console.error("Error en /api/files/upload-design:", err);
      return res.status(500).json({
        ok: false,
        message: "Error al subir diseño",
        error: String(err?.message || err)
      });
    }
  }
);

/**
 * GET /api/files/list/:modelKey
 * Lista archivos asociados a ese modelo
 */
router.get("/list/:modelKey", auth, async (req, res) => {
  try {
    const key = req.params.modelKey.trim();

    // DB Files
    const dbFiles = await listFilesByModelKeyService(key);

    // Fallback: buscar por coincidencia en disco si no hay registros en DB?
    // Let's keep the disk fallback for legacy files or files not in DB yet
    const fromDisk = fs.readdirSync(uploadsDir)
      .filter(f => f.toLowerCase().includes(key.toLowerCase()) && !dbFiles.some(dbf => dbf.filename === f))
      .map(f => {
        const stat = fs.statSync(path.join(uploadsDir, f));
        return { filename: f, url: `/uploads/${f}`, createdAt: stat.mtime, type: "unknown" };
      });

    const files = [...dbFiles, ...fromDisk];

    return res.json({ ok: true, data: files });
  } catch (err) {
    console.error("Error en /api/files/list:", err);
    return res.status(500).json({
      ok: false,
      message: "Error listando archivos",
      error: String(err?.message || err)
    });
  }
});

export default router;
