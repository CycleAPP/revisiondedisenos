// backend/src/services/expected.service.js
import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");
const uploadsDir = path.join(__dirname, "..", "uploads");

const defaultDesignInfo = path.join(dataDir, "expected", "DISEÑO-INFORMACIÓN.xlsx");
const defaultMasterXlsx = path.join(dataDir, "expected", "Master file (integrado).xlsx");
const defaultMasterJson = path.join(dataDir, "master-season.json");
const uploadedMasterJson = path.join(uploadsDir, "master_design_table.json");
const structureRulesPath = path.join(__dirname, "../../../tableConvert.com_ct419w.json");
const contentRulesPath = path.join(__dirname, "../../../tablageneral2.json");

function readJsonIfExists(p) {
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function readXlsxRows(p) {
  const wb = XLSX.readFile(p);
  const sheetName = wb.SheetNames.find((n) => /master/i.test(n)) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return { rows, sheetName };
}

function latestUploadByPattern(regex) {
  if (!fs.existsSync(uploadsDir)) return null;
  const files = fs
    .readdirSync(uploadsDir)
    .filter((f) => regex.test(f))
    .map((f) => ({ file: f, mtime: fs.statSync(path.join(uploadsDir, f)).mtime.getTime() }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.file ? path.join(uploadsDir, files[0].file) : null;
}

export function loadMasterTable() {
  if (fs.existsSync(uploadedMasterJson)) {
    const json = readJsonIfExists(uploadedMasterJson);
    return { rows: json?.rows || [], meta: { source: "upload", ...(json?.meta || {}) } };
  }

  const fallbackJson = readJsonIfExists(defaultMasterJson);
  if (fallbackJson?.rows?.length) {
    return { rows: fallbackJson.rows, meta: { source: "seed-json", file: defaultMasterJson } };
  }

  if (fs.existsSync(defaultMasterXlsx)) {
    const { rows, sheetName } = readXlsxRows(defaultMasterXlsx);
    return { rows, meta: { source: "seed-xlsx", file: defaultMasterXlsx, sheetName } };
  }

  return { rows: [], meta: { source: "empty" } };
}

export function loadDesignInfoTable() {
  const uploaded = latestUploadByPattern(/informacio/i);
  if (uploaded) {
    const { rows, sheetName } = readXlsxRows(uploaded);
    return { rows, meta: { source: "upload", file: uploaded, sheetName } };
  }

  if (fs.existsSync(defaultDesignInfo)) {
    const { rows, sheetName } = readXlsxRows(defaultDesignInfo);
    return { rows, meta: { source: "seed-xlsx", file: defaultDesignInfo, sheetName } };
  }

  return { rows: [], meta: { source: "empty" } };
}

function normalizeHeaderName(name, idx) {
  const clean = String(name || "").trim();
  if (!clean) return `col_${idx + 1}`;
  return clean.toLowerCase().replace(/[^\w]+/g, " ").trim().replace(/\s+/g, "_");
}

export function normalizeMasterTable(rawRows = []) {
  if (!rawRows.length) return { headerRow: -1, headers: [], rows: [] };

  const orderedKeys = Object.keys(rawRows[0]);
  const keywordScore = (val = "") => {
    const v = String(val).toLowerCase();
    return ["sku", "model", "item", "description", "bulb", "color", "wire", "pack"].some((k) =>
      v.includes(k)
    );
  };

  let headerRow = -1;
  let bestScore = 0;
  rawRows.forEach((row, idx) => {
    const score = orderedKeys.reduce((acc, key) => acc + (keywordScore(row[key]) ? 1 : 0), 0);
    if (score > bestScore && score >= 2) {
      headerRow = idx;
      bestScore = score;
    }
  });

  const baseHeaders =
    headerRow >= 0
      ? orderedKeys.map((k, i) => normalizeHeaderName(rawRows[headerRow][k], i))
      : orderedKeys.map((k, i) => normalizeHeaderName(k, i));

  const dataRows =
    headerRow >= 0 ? rawRows.slice(headerRow + 1) : rawRows;

  const normalizedRows = dataRows
    .map((row) => {
      const obj = {};
      orderedKeys.forEach((k, idx) => {
        obj[baseHeaders[idx]] = row[k];
      });
      return obj;
    })
    .filter((row) => Object.values(row).some((v) => String(v || "").trim() !== ""));

  return { headerRow, headers: baseHeaders, rows: normalizedRows };
}

function pickValue(row = {}, hints = []) {
  const entries = Object.entries(row).filter(([_, v]) => String(v || "").trim() !== "");
  for (const [key, val] of entries) {
    const nk = key.toLowerCase();
    if (hints.some((h) => nk.includes(h))) return val;
  }
  return "";
}

function parseNumberLike(val) {
  if (val == null) return null;
  const match = String(val).replace(/[, ]/g, "").match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

const structureRules = readJsonIfExists(structureRulesPath) || [];
const contentRules = readJsonIfExists(contentRulesPath) || [];

function inferReqType(text = "") {
  const t = String(text).toLowerCase();
  return /(logo|logotipo|foto|imagen|icono|sello|diagrama|gr(á|a)fico)/.test(t) ? "VISUAL" : "TEXT";
}

function cleanRequirement(val) {
  const v = String(val || "").trim();
  if (!v) return "";
  if (/^n\/?a$|no aplica|tbd/i.test(v)) return "";
  return v;
}

function dedupeRequirements(list = []) {
  const map = new Map();
  list.forEach((r) => {
    const key = cleanRequirement(r.requirement).toLowerCase();
    if (!key) return;
    const existing = map.get(key);
    if (!existing || r.requirement.length < existing.requirement.length) {
      map.set(key, { ...r, requirement: cleanRequirement(r.requirement) });
    }
  });
  return Array.from(map.values());
}

function selectRuleByCategory(rules = [], ctx = {}) {
  const target = `${ctx.category || ""} ${ctx.description || ""}`.toLowerCase();
  if (!rules.length) return null;
  const hit = rules.find((r) => target.includes(String(r.Categoria || r.categoria || "").toLowerCase()));
  return hit || rules[0];
}

function extractStructureRequirements(ctx = {}, ruleOverride = null) {
  const rule = ruleOverride || selectRuleByCategory(structureRules, ctx);
  if (!rule) return [];
  const reqs = [];
  Object.entries(rule).forEach(([k, v]) => {
    if (!/cara\s|\bface\b/i.test(k) && !/frente|lateral|vuelta|tapa|base/i.test(k)) return;
    splitCellText(v).forEach((txt) => {
      const clean = cleanRequirement(txt);
      if (!clean) return;
      reqs.push({ requirement: clean, type: inferReqType(clean), source: "structure" });
    });
  });
  return reqs;
}

function extractContentRequirements(ctx = {}, ruleOverride = null) {
  const rule = ruleOverride || selectRuleByCategory(contentRules, ctx);
  if (!rule) return [];
  const reqs = [];

  // Helper to check if a text mentions a specific bulb count that conflicts with the model's
  const isIrrelevant = (text) => {
    const match = String(text).match(/(\d+)\s*(luces|lights)/i);
    if (match && ctx.bulbCount) {
      const num = parseInt(match[1], 10);
      // If the number in text is different from model's bulb count, it's irrelevant
      // (Allowing a small margin? No, usually it's exact for these series)
      if (num !== Number(ctx.bulbCount)) return true;
    }
    return false;
  };

  ["Descripción", "Caracteristicas", "Caracteristicas:", "Claims", "Diagrama", "Tabla informativa / Gráfico", "Tabla informativa/ Gráfico"].forEach((field) => {
    if (!(field in rule)) return;
    splitCellText(rule[field]).forEach((txt) => {
      const clean = cleanRequirement(txt);
      if (!clean) return;
      if (isIrrelevant(clean)) return; // Skip irrelevant requirements

      reqs.push({ requirement: clean, type: field.toLowerCase().includes("diagrama") ? "VISUAL" : inferReqType(clean), source: "content" });
    });
  });
  return reqs;
}

export function findMasterRow(normalizedRows, modelKey) {
  const key = String(modelKey || "").trim().toLowerCase();
  if (!key) return null;

  const modelColumns = Object.keys(normalizedRows[0] || {}).filter((k) =>
    /(sku|model|item)/i.test(k)
  );

  let row =
    normalizedRows.find((r) =>
      modelColumns.some((col) => String(r[col] || "").trim().toLowerCase() === key)
    ) ||
    normalizedRows.find((r) =>
      Object.values(r).some((v) => String(v || "").trim().toLowerCase() === key)
    );

  return row || null;
}

export function buildMasterContext(row = {}) {
  const ctx = {
    model: pickValue(row, ["sku", "model", "item"]),
    description: pickValue(row, ["description", "desc", "goods", "item_description", "descripcion"]),
    packaging: pickValue(row, ["packaging", "empaque"]),
    packagingFinish: pickValue(row, ["packaging_finish", "finish"]),
    bulbTech: pickValue(row, ["bulb_tech", "technology", "tech"]),
    bulbCount: pickValue(row, ["#_of_bulbs", "bulbs", "lights", "luces"]),
    bulbColor: pickValue(row, ["color_bulb", "bulb_color", "color"]),
    wireColor: pickValue(row, ["wire_color", "wire"]),
    powerSupply: pickValue(row, ["power", "power_supply", "voltage"]),
    totalLength: pickValue(row, ["total_length", "length"]),
    lightedLength: pickValue(row, ["lighted_length"]),
    leadIn: pickValue(row, ["lead_in"]),
    leadOut: pickValue(row, ["lead_out"]),
    endConnector: pickValue(row, ["end_connector", "connector"]),
    functions: pickValue(row, ["functions", "function"]),
    accessories: pickValue(row, ["accs", "accessories", "extras"]),
    claims: pickValue(row, ["claims", "claim"]),
    brand: pickValue(row, ["marca", "brand"]),
    vendor: pickValue(row, ["vendor", "supplier"]),
    origin: pickValue(row, ["origen", "country", "pais"]),
    upc: pickValue(row, ["upc", "barcode"]),
    category: pickValue(row, ["categoria", "category"]),
  };

  const cleanCount = parseNumberLike(ctx.bulbCount);
  if (cleanCount) ctx.bulbCount = cleanCount;

  return ctx;
}

function guessFaceKey(header) {
  const h = String(header || "").toLowerCase();
  if (/frente|front|cara\s*1/.test(h)) return "frente";
  if (/lateral|cara\s*2/.test(h)) return "cara2";
  if (/cara\s*3/.test(h)) return "cara3";
  if (/vuelta|back|reverso/.test(h)) return "cara4";
  if (/tapa|top/.test(h)) return "tapa";
  if (/base|bottom/.test(h)) return "base";
  return null;
}

function splitCellText(text) {
  if (!text) return [];
  const raw = String(text).trim();
  if (!raw || /^n\/?a$/i.test(raw)) return [];
  return raw
    .split(/[\n;]+|,(?!\s?\d)/)
    .map((t) => t.replace(/\r/g, "").trim())
    .filter(Boolean);
}

function buildTechBullets(ctx) {
  const arr = [];
  if (ctx.bulbCount || ctx.bulbTech) {
    const pieces = [];
    if (ctx.bulbCount) pieces.push(`${ctx.bulbCount} luces`);
    if (ctx.bulbTech) pieces.push(String(ctx.bulbTech).toUpperCase());
    arr.push(pieces.join(" • "));
  }
  if (ctx.bulbColor) arr.push(`Color de luz: ${ctx.bulbColor}`);
  if (ctx.wireColor) arr.push(`Cable: ${ctx.wireColor}`);
  if (ctx.powerSupply) arr.push(`Alimentación: ${ctx.powerSupply}`);
  if (ctx.endConnector) arr.push(`Conector: ${ctx.endConnector}`);
  if (ctx.functions) arr.push(`Funciones: ${ctx.functions}`);
  if (ctx.claims) arr.push(`Claims destacados: ${ctx.claims}`);
  if (ctx.accessories) arr.push(`Incluye: ${ctx.accessories}`);
  return arr.filter(Boolean);
}

function buildFaces(designRow, ctx) {
  const faces = { frente: [], cara2: [], cara3: [], cara4: [], tapa: [], base: [] };

  if (designRow) {
    for (const [k, v] of Object.entries(designRow)) {
      const faceKey = guessFaceKey(k);
      if (!faceKey) continue;
      faces[faceKey].push(...splitCellText(v));
    }
  }

  // Enriquecemos con datos técnicos del master
  const tech = buildTechBullets(ctx);
  if (tech.length) {
    faces.frente.unshift(...tech.slice(0, 2));
    faces.cara2.push(...tech);
    faces.cara3.push(...tech.slice(0, 3));
    faces.cara4.push(...tech.slice(-3));
  }

  if (ctx.description) faces.frente.unshift(String(ctx.description));
  if (ctx.brand) faces.tapa.unshift(`Marca: ${ctx.brand}`);
  if (ctx.model) faces.tapa.push(`Modelo: ${ctx.model}`);
  if (ctx.origin) faces.base.push(`Origen: ${ctx.origin}`);
  if (ctx.vendor) faces.base.push(`Proveedor: ${ctx.vendor}`);

  // Limpia duplicados y espacios
  Object.keys(faces).forEach((k) => {
    const seen = new Set();
    faces[k] = faces[k]
      .map((t) => t.trim())
      .filter((t) => t && !seen.has(t) && seen.add(t));
  });

  return faces;
}

function buildMasterRequirements(ctx = {}) {
  const fields = [
    ctx.description && `Descripción: ${ctx.description}`,
    ctx.bulbCount && `${ctx.bulbCount} luces`,
    ctx.bulbColor && `Color de luz: ${ctx.bulbColor}`,
    ctx.wireColor && `Color de cable: ${ctx.wireColor}`,
    ctx.powerSupply && `Alimentación: ${ctx.powerSupply}`,
    ctx.upc && `UPC: ${ctx.upc}`,
  ].filter(Boolean);

  return fields.map((requirement) => ({
    requirement,
    type: "TEXT",
    source: "master",
  }));
}

function buildChecklist(faces, ctx) {
  const list = [];
  Object.entries(faces).forEach(([k, arr]) => {
    list.push(`${k}: ${arr.slice(0, 3).join(" | ") || "Sin definir"}`);
  });
  if (ctx.bulbCount) list.push(`Confirma número de luces (${ctx.bulbCount}) visible en frente y laterales.`);
  if (ctx.bulbColor) list.push(`Verifica color de luz (${ctx.bulbColor}).`);
  if (ctx.wireColor) list.push(`Color de cable (${ctx.wireColor}) indicado en algún lateral.`);
  if (ctx.powerSupply) list.push(`Datos eléctricos / alimentación (${ctx.powerSupply}) en cara informativa.`);
  list.push("Cara base debe incluir UPC y bloque NOM/advertencias.");
  return list;
}

function buildResumen(ctx) {
  const parts = [];
  if (ctx.description) parts.push(ctx.description);

  const tech = [];
  if (ctx.bulbCount) tech.push(`${ctx.bulbCount} luces`);
  if (ctx.bulbTech) tech.push(String(ctx.bulbTech).toUpperCase());
  if (ctx.bulbColor) tech.push(`color ${ctx.bulbColor}`);
  if (ctx.wireColor) tech.push(`cable ${ctx.wireColor}`);
  if (tech.length) parts.push(tech.join(", "));
  if (ctx.functions) parts.push(`Funciones: ${ctx.functions}`);
  if (ctx.accessories) parts.push(`Incluye: ${ctx.accessories}`);
  return parts.join(". ");
}

function suggestPackaging(ctx, designRow) {
  const packaging = (ctx.packaging || designRow?.Empaque || "").toString().toLowerCase();
  const faces = parseNumberLike(designRow?.["No. Caras"]) || null;
  const templates = [
    { match: /full\s*color|caja|box/, name: "Caja full color", file: "/templates/caja-fullcolor.ai" },
    { match: /cintillo|fajilla|strip/, name: "Cintillo/Fajilla", file: "/templates/cintillo.ai" },
    { match: /clamshell|blister/, name: "Blister/Clamshell", file: "/templates/clamshell.ai" },
    { match: /carrete|reel/, name: "Carrete", file: "/templates/carrete.ai" },
  ];

  const found = templates.find((t) => t.match.test(packaging)) || templates[0];

  const notes = [];
  if (faces) notes.push(`Plantilla pensada para ${faces} caras.`);
  if (ctx.upc) notes.push(`Ubicar UPC (${ctx.upc}) en base o lateral según dieline.`);
  if (ctx.description) notes.push(`Usar descripción: ${ctx.description}`);

  return {
    type: found?.name || "Caja full color",
    faces: faces || 6,
    templateFile: found?.file,
    notes,
  };
}

export function selectDesignRow(designRows = [], ctx = {}) {
  if (!designRows.length) return { row: null, score: 0, matchedBy: [] };

  const targetCategory = String(ctx.description || ctx.packaging || "").toLowerCase();
  const targetLights = parseNumberLike(ctx.bulbCount);
  const targetTech = String(ctx.bulbTech || "").toLowerCase();

  let best = { row: null, score: -1, matchedBy: [] };

  for (const row of designRows) {
    let score = 0;
    const matchedBy = [];

    const rowCategory = String(row["Categoria"] || row["Category"] || "").toLowerCase();
    if (rowCategory && targetCategory && targetCategory.includes(rowCategory)) {
      score += 3;
      matchedBy.push("categoría");
    }

    const rowLights = parseNumberLike(row["N. luces"]);
    if (rowLights && targetLights && rowLights === targetLights) {
      score += 2;
      matchedBy.push("número de luces");
    }

    const rowTech = String(row["Tecnología"] || row["Technology"] || "").toLowerCase();
    if (rowTech && targetTech && rowTech.includes(targetTech)) {
      score += 2;
      matchedBy.push("tecnología");
    }

    if (score > best.score) best = { row, score, matchedBy };
  }

  if (!best.row) best = { row: designRows[0], score: 0, matchedBy: ["fallback"] };
  return best;
}

export function buildExpectedForModel(modelKey) {
  const masterTable = loadMasterTable();
  if (!masterTable.rows.length) {
    const err = new Error("No hay tabla Master Season cargada.");
    err.code = "NO_MASTER";
    throw err;
  }

  const normalized = normalizeMasterTable(masterTable.rows);
  const masterRow = findMasterRow(normalized.rows, modelKey);
  if (!masterRow) {
    const err = new Error(`No se encontró información para ${modelKey}`);
    err.code = "NOT_FOUND";
    throw err;
  }

  const masterContext = buildMasterContext(masterRow);
  const designTable = loadDesignInfoTable();
  const designMatch = selectDesignRow(designTable.rows, masterContext);
  const caras = buildFaces(designMatch.row, masterContext);
  const resumenModelo = buildResumen(masterContext);
  const checklist = buildChecklist(caras, masterContext);
  const packagingSuggestion = suggestPackaging(masterContext, designMatch.row);
  const expectedFields = {
    itemDescription: masterContext.description || masterContext.model || "",
    upc: masterContext.upc || "",
    wireColor: masterContext.wireColor || "",
    powerSupply: masterContext.powerSupply || "",
  };
  const structureRule = selectRuleByCategory(structureRules, masterContext);
  const contentRule = selectRuleByCategory(contentRules, masterContext);
  const globalRequirements = dedupeRequirements([
    ...buildMasterRequirements(masterContext),
    ...extractContentRequirements(masterContext, contentRule),
  ]);

  return {
    modelKey,
    meta: {
      master: masterTable.meta,
      design: designTable.meta,
      normalization: { headerRow: normalized.headerRow },
    },
    masterRow,
    designRow: designMatch.row,
    masterContext,
    packagingSuggestion,
    expectedFields,
    resumenModelo,
    caras,
    textosPorCara: caras,
    checklist,
    globalRequirements,
    rulesUsed: {
      structureCategory: structureRule?.Categoria || structureRule?.category || null,
      contentCategory: contentRule?.Categoria || contentRule?.category || null,
    },
    notasExtras: designMatch.matchedBy.length ? [`Coincidencia diseño-info por ${designMatch.matchedBy.join(", ")}`] : [],
  };
}
