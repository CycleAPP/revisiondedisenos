// backend/src/services/designInfo.service.js
import fs from "fs";
import path from "path";
import XLSX from "xlsx";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const DESIGN_JSON = path.join(DATA_DIR, "design-info.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Lee el Excel de DISEÑO-INFORMACIÓN y lo guarda como JSON
 */
export function parseAndSaveDesignInfo(xlsxPath) {
  ensureDataDir();

  const wb = XLSX.readFile(xlsxPath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
  });

  fs.writeFileSync(
    DESIGN_JSON,
    JSON.stringify({ rows }, null, 2),
    "utf8"
  );

  return { count: rows.length, jsonPath: DESIGN_JSON, sheetName };
}

/**
 * Carga el JSON de Diseño-Información
 */
export function loadDesignInfo() {
  if (!fs.existsSync(DESIGN_JSON)) return { rows: [] };
  const raw = fs.readFileSync(DESIGN_JSON, "utf8");
  return JSON.parse(raw);
}
