// backend/src/services/masterSeason.service.js
import fs from "fs";
import path from "path";
import XLSX from "xlsx";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const MASTER_JSON = path.join(DATA_DIR, "master-season.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Lee el Excel de Master Season y guarda un JSON en src/data/master-season.json
 */
export function parseAndSaveMasterSeason(xlsxPath) {
  ensureDataDir();

  const wb = XLSX.readFile(xlsxPath);
  const sheetName =
    wb.SheetNames.find((n) => /master/i.test(n)) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "", // no undefined
  });

  fs.writeFileSync(
    MASTER_JSON,
    JSON.stringify({ rows }, null, 2),
    "utf8"
  );

  return { count: rows.length, jsonPath: MASTER_JSON, sheetName };
}

/**
 * Carga el JSON del Master Season
 */
export function loadMasterSeason() {
  if (!fs.existsSync(MASTER_JSON)) return { rows: [] };
  const raw = fs.readFileSync(MASTER_JSON, "utf8");
  return JSON.parse(raw);
}

/**
 * Busca una fila por modelo (X01, X17, AX51, etc.)
 * Intenta en todas las columnas que tengan "model" en el header.
 */
export function findMasterRowByModel(modelKey) {
  const { rows } = loadMasterSeason();
  if (!rows || !rows.length) return null;

  const keyLower = String(modelKey || "").trim().toLowerCase();
  const first = rows[0] || {};
  const modelCols = Object.keys(first).filter((k) =>
    /model/i.test(k)
  );

  if (!modelCols.length) {
    // fallback bruto: busca en TODAS las columnas
    for (const row of rows) {
      for (const val of Object.values(row)) {
        if (
          String(val || "").trim().toLowerCase() === keyLower
        ) {
          return row;
        }
      }
    }
    return null;
  }

  for (const row of rows) {
    for (const col of modelCols) {
      const val = String(row[col] || "").trim().toLowerCase();
      if (val && val === keyLower) return row;
    }
  }

  return null;
}
