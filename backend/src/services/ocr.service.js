import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { analyzePdf } from "./azure.service.js";
import { parseTextWithOpenAI, analyzeImageWithOpenAI } from "./openai.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Google AI Client
const apiKey = process.env.GOOGLE_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
// UPGRADE: Use gemini-1.5-pro for better reasoning and vision capabilities
const geminiModel = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB limit

/**
 * Prepare file for Gemini processing using inline data.
 * Modern approach that doesn't require file upload API.
 */
async function uploadToGemini(filePath, mimeType) {
  try {
    // For newer versions, we can use inline data instead of uploading
    const fileData = fs.readFileSync(filePath);
    const base64Data = fileData.toString('base64');

    console.log(`[ocr] Prepared file ${path.basename(filePath)} for Gemini (${mimeType})`);

    // Return inline data format for Gemini
    return {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };
  } catch (error) {
    console.error("[ocr] Error preparing file for Gemini:", error);
    throw new Error(`Failed to prepare file for Gemini: ${error.message}`);
  }
}

/**
 * Extracts raw text from PDF using a simple text extractor (fallback/auxiliary).
 */
async function extractPdfText(localPath) {
  return "";
}

function deriveGlobalValidation(raw = {}) {
  const requirements = [];

  // From structure-style validation
  if (Array.isArray(raw?.validation?.details)) {
    raw.validation.details.forEach((d) => {
      if (!d?.requirement) return;
      requirements.push({
        requirement: d.requirement,
        type: d.type || "TEXT",
        status: d.status || "MISSING",
        foundText: Array.isArray(d.foundText) ? d.foundText : d.foundText ? [d.foundText] : [],
        source: "structure",
      });
    });
  }

  // From content-based validation
  if (raw?.contentValidation?.details && typeof raw.contentValidation.details === "object") {
    Object.entries(raw.contentValidation.details).forEach(([k, v]) => {
      if (!v) return;
      requirements.push({
        requirement: k,
        type: v.type || (k.toLowerCase().includes("diagrama") ? "VISUAL" : "TEXT"),
        status: v.status || "MISSING",
        foundText: Array.isArray(v.foundText) ? v.foundText : v.foundText ? [v.foundText] : [],
        source: "content",
      });
    });
  }

  const missing = requirements.filter((r) => r.type !== "VISUAL" && r.status && r.status !== "OK");
  const overallStatus = missing.length ? "REJECTED" : "APPROVED";

  return {
    requirements,
    overallStatus,
    missing: missing.map((m) => m.requirement),
  };
}

function normalizeOcrOutput(raw) {
  const faces = raw?.faces || {};
  const normalizeFace = (v) => {
    if (!v) return { texts: [], box: null };
    if (Array.isArray(v)) return { texts: v.map(String), box: null };
    if (typeof v === "string") return { texts: v.split(/\n+/).map((t) => t.trim()).filter(Boolean), box: null };

    const texts = Array.isArray(v.texts) ? v.texts.map(String) : [];
    const box = Array.isArray(v.box) && v.box.length === 4 ? v.box : null;
    return { texts, box };
  };

  const product = raw?.product || {};
  const fromRoot = raw || {};

  const getVal = (obj, key) => {
    const val = obj?.[key];
    if (val && typeof val === 'object' && 'value' in val) return val.value;
    return val || "";
  };

  const getBox = (obj, key) => {
    const val = obj?.[key];
    if (val && typeof val === 'object' && Array.isArray(val.box)) return val.box;
    return null;
  };

  const globalValidation = raw?.globalValidation || deriveGlobalValidation(raw);
  const rawText = raw?.rawText || raw?.text || "";

  return {
    rawText,
    ocrText: rawText,
    product: {
      itemDescription: getVal(product, 'itemDescription') || fromRoot.productName || "",
      bulbsCount: getVal(product, 'bulbsCount') ?? product.bulbCount ?? fromRoot.bulbCount ?? null,
      lightColor: getVal(product, 'lightColor') || product.bulbColor || fromRoot.bulbColor || "",
      wireColor: getVal(product, 'wireColor') || fromRoot.wireColor || "",
      powerSupply: getVal(product, 'powerSupply') || fromRoot.powerSupply || "",
      upc: getVal(product, 'upc') || fromRoot.upc || "",
      _boxes: {
        itemDescription: getBox(product, 'itemDescription'),
        bulbsCount: getBox(product, 'bulbsCount'),
        lightColor: getBox(product, 'lightColor'),
        wireColor: getBox(product, 'wireColor'),
        powerSupply: getBox(product, 'powerSupply'),
        upc: getBox(product, 'upc'),
      }
    },
    faces: {
      frente: normalizeFace(faces.frente || fromRoot.front),
      cara2: normalizeFace(faces.cara2 || faces.lateral1 || fromRoot.side1),
      cara3: normalizeFace(faces.cara3 || faces.lateral2 || fromRoot.side2),
      cara4: normalizeFace(faces.cara4 || faces.back || fromRoot.back),
      tapa: normalizeFace(faces.tapa || faces.top || fromRoot.top),
      base: normalizeFace(faces.base || faces.bottom || fromRoot.bottom),
    },
    claims: Array.isArray(raw?.claims) ? raw.claims.map(c => typeof c === 'string' ? c : c.text) : [],
    warnings: typeof raw?.warnings === 'object' ? raw.warnings.text : (raw?.warnings || ""),
    functions: Array.isArray(raw?.functions) ? raw.functions.map(f => typeof f === 'string' ? f : f.text) : [],
    validation: raw?.validation || null,
    contentValidation: raw?.contentValidation || null,
    globalValidation,
    _rawBoxes: {
      claims: Array.isArray(raw?.claims) ? raw.claims.map(c => c.box) : [],
    }
  };
}

export async function analyzeDesignWithAI(localPath, expected = {}) {
  if (!fs.existsSync(localPath)) {
    return { error: true, status: "OCR_ERROR_FILE_NOT_FOUND", message: "Archivo no encontrado" };
  }

  // Check for OpenAI Key (required for both paths for reasoning/vision)
  if (!process.env.OPENAI_API_KEY) {
    return { error: true, status: "OCR_ERROR_NO_API_KEY", message: "Servicio de IA no configurado (Falta OPENAI_API_KEY)" };
  }

  const stat = fs.statSync(localPath);
  if (stat.size > MAX_FILE_BYTES) {
    return { error: true, status: "OCR_ERROR_FILE_TOO_LARGE", message: `Archivo demasiado grande (${Math.round(stat.size / 1024 / 1024)}MB > 20MB)` };
  }

  // Prepare hints for the AI
  const mandatoryTexts = (expected?.globalRequirements || [])
    .map((r) => r.requirement)
    .filter(Boolean);

  const hints = [
    expected?.expectedFields?.itemDescription,
    expected?.expectedFields?.upc,
    expected?.masterContext?.wireColor,
    expected?.masterContext?.bulbColor,
    expected?.masterContext?.bulbCount,
    ...mandatoryTexts
  ]
    .filter(Boolean)
    .map(String)
    .join(" | ");

  const prompt = `
**ROL:** Eres un verificador experto de artes de empaque (Packaging QA). Tu trabajo es analizar el diseño y verificar que cumpla con los textos obligatorios.
**TAREA:**
1. Analiza el archivo (Imagen/Texto) y extrae la información del producto.
2. **VERIFICACIÓN INTELIGENTE:** Revisa si los siguientes "Textos Obligatorios" están presentes en el diseño.
   - **IMPORTANTE:** Al buscar estos textos, sé flexible. Ignora palabras conectoras como "logo", "y", "o", "con".
   - Ejemplo: Si se pide "Logo FSC y Reciclable", es válido si encuentras el logo FSC y el símbolo/texto de reciclaje, aunque no diga literalmente "Logo" o "y".
   - Ejemplo: Si se pide "Hecho en China", es válido "Made in China".
   - **EXCEPCIÓN:** Si el requerimiento menciona "Alimentación", "Power Supply", "Volts", "Watts", "Hz" o "Año", márcalo SIEMPRE como status "OK" (Validado externamente).
   - Si el texto está presente (o su equivalente visual/semántico), marca status "OK". Si no, "MISSING".

**LISTA DE TEXTOS OBLIGATORIOS A VERIFICAR:**
${mandatoryTexts.map(t => `- ${t}`).join('\n')}

**FORMATO DE SALIDA (JSON PURO):**
{
  "product": { 
    "itemDescription": { "value": "string", "box": [ymin, xmin, ymax, xmax] }, 
    "bulbsCount": { "value": "number", "box": [...] }, 
    "lightColor": { "value": "string", "box": [...] }, 
    "wireColor": { "value": "string", "box": [...] }, 
    "powerSupply": { "value": "string", "box": [...] }, 
    "upc": { "value": "string", "box": [...] } 
  },
  "contentValidation": {
    "details": {
      "${mandatoryTexts[0] || "Ejemplo"}": { "type": "TEXT", "status": "OK|MISSING", "foundText": "texto encontrado" }
      // ... repetir para cada texto obligatorio
    }
  },
  "faces": { 
    "frente": {"texts": ["string"], "box": [...]}, 
    // ... otras caras (cara2, cara3, cara4, tapa, base)
  },
  "rawText": "Todo el texto encontrado en el archivo"
}
`.trim();

  try {
    const ext = path.extname(localPath).toLowerCase();
    let parsed;

    if (ext === ".pdf") {
      // PDF PATH: Azure OCR -> OpenAI Reasoning
      console.log(`[ocr] Processing PDF with Azure: ${localPath}`);
      const rawText = await analyzePdf(localPath);
      if (!rawText) {
        throw new Error("Azure no pudo extraer texto del PDF.");
      }
      console.log(`[ocr] Azure extracted ${rawText.length} chars. Sending to OpenAI...`);
      parsed = await parseTextWithOpenAI(rawText, hints);
      parsed.rawText = rawText; // Ensure raw text is preserved

    } else {
      // IMAGE PATH: OpenAI Vision
      console.log(`[ocr] Processing Image with OpenAI Vision: ${localPath}`);
      parsed = await analyzeImageWithOpenAI(localPath, prompt);
    }

    const normalized = normalizeOcrOutput(parsed);
    normalized._raw = JSON.stringify(parsed);
    if (!normalized.rawText) normalized.rawText = parsed?.rawText || "";
    if (!normalized.ocrText) normalized.ocrText = normalized.rawText;

    return normalized;

  } catch (err) {
    console.error("[ocr] Error general en el pipeline de Vision:", err);
    return { error: true, status: "OCR_ERROR_UNKNOWN", message: err.message || String(err), fallback: "VISION_FAIL" };
  }
}
