import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load validation rules
const rulesPath = path.join(__dirname, '../../../tableConvert.com_ct419w.json');
const contentRulesPath = path.join(__dirname, '../../../tablageneral2.json');

let validationRules = [];
let contentRules = [];

try {
  if (fs.existsSync(rulesPath)) {
    const raw = fs.readFileSync(rulesPath, 'utf-8');
    validationRules = JSON.parse(raw);
  } else {
    console.warn("[openai] Validation rules file not found at:", rulesPath);
  }

  if (fs.existsSync(contentRulesPath)) {
    const rawContent = fs.readFileSync(contentRulesPath, 'utf-8');
    contentRules = JSON.parse(rawContent);
  } else {
    console.warn("[openai] Content rules file not found at:", contentRulesPath);
  }

} catch (e) {
  console.error("[openai] Failed to load validation rules:", e);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Parses raw text using OpenAI to extract structured data and a GLOBAL (no faces) validation.
 * @param {string} text - The raw text to parse (full OCR).
 * @param {string} hints - Optional hints for the extraction.
 * @returns {Promise<Object>} - The parsed JSON object.
 */
export async function parseTextWithOpenAI(text, hints = "") {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API Key not configured.");
  }

  const prompt = `
**ROL:** Verificador experto de artes de empaque. No asumas caras; el OCR es global.
**OBJETIVO:** Confirmar que el diseño incluye TODA la información obligatoria definida en las reglas, aunque esté redactada distinto, en otro idioma o en otra zona del arte. Si todo lo requerido aparece en el OCR, el estado debe ser **APPROVED**.

**FUENTES DE REGLAS (referencia, no texto literal):**
- ESTRUCTURA (solo guía, no valida por cara): ${JSON.stringify(validationRules)}
- CONTENIDO obligatorio por categoría (esto sí es mandatorio): ${JSON.stringify(contentRules)}

**INSTRUCCIONES:**
1) Usa el TEXTO OCR COMPLETO (sin segmentar por caras): 
${text}

2) Construye un catálogo de REQUERIMIENTOS GLOBALES combinando:
   - CONTENIDO obligatorio por categoría (principal fuente).
   - Datos maestros del modelo (hints).
   - Usa la ESTRUCTURA solo como referencia orientativa, no como requerimiento estricto.
   - Separa por saltos de línea, comas o bullets.
   - Ignora valores vacíos, "N/A", "No aplica", "TBD" y similares.
   - Clasifica **type**:
     - "VISUAL" si menciona logo/logotipo/foto/imagen/icono/sello/diagrama/gráfico.
     - "TEXT" para todo lo demás (descripciones, claims, tablas, NOM, UPC, medidas).
   - Deduplica manteniendo la frase más corta.

3) VALIDACIÓN GLOBAL (sin caras):
   - Para cada requerimiento type TEXT busca evidencia en TODO el texto OCR.
   - Acepta coincidencia semántica (es/en): "luz cálida" ~ "warm light" ~ "warm white"; "cable blanco" ~ "white wire"; "100 luces" ~ "100 lights"; medidas "6.1 m" ~ "6.10 m".
   - Si hay evidencia clara: status "OK" y agrega hasta 2 fragmentos en foundText.
   - Si no hay evidencia: status "MISSING".
   - type VISUAL => status "VISUAL_CHECK" (no falla).

4) OVERALL:
   - **APPROVED**: ningún requerimiento TEXT en MISSING.
   - **REJECTED**: al menos un requerimiento TEXT en MISSING.
   - **WARNING**: dudas parciales pero sin faltantes claros.

5) EXTRAER PRODUCTO: itemDescription, bulbsCount, lightColor, wireColor, powerSupply, upc y categorizaciones detectadas.

6) DEVUELVE SOLO ESTE JSON:
{
  "product": {
    "itemDescription": { "value": "string", "box": null },
    "bulbsCount": { "value": "number|string", "box": null },
    "lightColor": { "value": "string", "box": null },
    "wireColor": { "value": "string", "box": null },
    "powerSupply": { "value": "string", "box": null },
    "upc": { "value": "string", "box": null },
    "detectedCategory": "string",
    "detectedTech": "string",
    "detectedPackaging": "string"
  },
  "validation": {
    "ruleFound": boolean,
    "matchedRuleIndex": number,
    "details": [
      { "requirement": "string", "type": "TEXT|VISUAL", "status": "OK|MISSING|VISUAL_CHECK", "foundText": ["string"] }
    ],
    "overallStatus": "APPROVED|REJECTED|WARNING"
  },
  "contentValidation": {
    "ruleFound": boolean,
    "matchedCategory": "string",
    "details": {
      "Descripción": { "status": "OK|MISSING", "type": "TEXT", "foundText": ["string"] },
      "Caracteristicas": { "status": "OK|MISSING", "type": "TEXT", "foundText": ["string"] },
      "Claims": { "status": "OK|MISSING", "type": "TEXT", "foundText": ["string"] },
      "Diagrama": { "status": "OK|MISSING|VISUAL_CHECK", "type": "VISUAL", "foundText": ["string"] },
      "Tabla informativa / Gráfico": { "status": "OK|MISSING", "type": "TEXT", "foundText": ["string"] }
    },
    "overallStatus": "APPROVED|REJECTED|WARNING"
  },
  "globalValidation": {
    "requirements": [
      { "requirement": "string", "source": "structure|content|master", "type": "TEXT|VISUAL", "status": "OK|MISSING|VISUAL_CHECK", "foundText": ["string"] }
    ],
    "overallStatus": "APPROVED|REJECTED|WARNING",
    "missing": ["string"]
  },
  "claims": [{ "text": "string", "box": null }],
  "warnings": { "text": "string", "box": null },
  "functions": [{ "text": "string", "box": null }],
  "rawText": ${JSON.stringify(text)}
}
**Contexto/Hints:** ${hints || "N/A"}
`.trim();

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = completion.choices[0].message.content;
    return JSON.parse(content);

  } catch (error) {
    console.error("[openai] Error parsing text:", error);
    throw error;
  }
}

/**
 * Analyzes an image (or PDF converted to image) using OpenAI GPT-4o Vision.
 * @param {string} filePath - Path to the local file.
 * @param {string} promptText - The prompt to send to the AI.
 * @returns {Promise<Object>} - The parsed JSON response.
 */
export async function analyzeImageWithOpenAI(filePath, promptText) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API Key not configured.");
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = "image/jpeg";
    if (ext === ".png") mimeType = "image/png";
    else if (ext === ".webp") mimeType = "image/webp";

    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = completion.choices[0].message.content;
    return JSON.parse(content);

  } catch (error) {
    console.error("[openai] Error analyzing image:", error);
    throw error;
  }
}

