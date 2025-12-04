// backend/src/routes/assistant.routes.js
import { Router } from "express";
import { randomUUID } from "crypto";
import { auth } from "../middlewares/auth.js";
import { getThreadService, createThreadService, addMessageService, clearThreadService } from "../services/assistant.service.js";

const router = Router();

function formatFaces(expectedFaces = {}) {
  return Object.entries(expectedFaces)
    .map(([cara, textos]) => `${cara}: ${(textos || []).join(" | ")}`)
    .join("\n");
}

function buildContextPrompt(message, context) {
  if (!context) return message;
  const parts = [
    "Actúa como revisor senior de empaques. Responde en español, tono claro y accionable.",
    "Estructura de respuesta:",
    "- Resumen rápido (1-2 frases).",
    "- Errores críticos (bullets).",
    "- Checklist por cara (Frente, Cara 2, Cara 3, Cara 4, Tapa, Base) con lo que debe corregir.",
    "- Sugerencias de diseño concretas.",
    context.modelKey ? `Modelo: ${context.modelKey}` : "",
    context.masterSummary ? `Resumen Master: ${context.masterSummary}` : "",
    context.packaging ? `Empaque sugerido: ${context.packaging.type || ""} (${context.packaging.templateFile || "sin plantilla"})` : "",
    context.expectedFaces ? `Textos esperados:\n${formatFaces(context.expectedFaces)}` : "",
    context.validation ? `Resultado validación:\n${JSON.stringify(context.validation, null, 2)}` : "",
    message ? `Pregunta del usuario: ${message}` : "Da checklist según contexto.",
  ].filter(Boolean);
  return parts.join("\n\n");
}

/** Utilidad: respuesta fallback cuando no hay OpenAI */
function fallbackReply(userText = "", context = null) {
  const short = (userText || "").slice(0, 140);
  const base = [
    "Guía rápida por cara:",
    "- Frente: nombre del producto, cantidad de luces, tecnología y foto principal.",
    "- Laterales: bullets técnicos (color de luz, cable, longitud, funciones).",
    "- Vuelta: advertencias, instrucciones y datos NOM.",
    "- Tapa/Base: modelo, UPC y datos legales.",
    context?.expectedFaces ? `Textos esperados: ${formatFaces(context.expectedFaces)}` : "",
    short ? `Nota del usuario: “${short}”` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return base;
}

/** Intenta crear respuesta con OpenAI si está disponible */
async function tryOpenAIResponse({ prompt, imageUrl, temperature }) {
  try {
    if (!process.env.OPENAI_API_KEY) return null;
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Construimos contenido multimodal (texto + imagen opcional)
    const input = [
      { type: "text", text: prompt || "Asiste con un checklist de validación de etiquetas." },
    ];
    if (imageUrl) {
      input.push({ type: "image_url", image_url: { url: imageUrl } });
    }

    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente de control de calidad de empaques. Devuelve mensajes breves con pasos accionables, en español, usando bullets por cara de la caja.",
        },
        { role: "user", content: input },
      ],
      temperature: temperature || 0.2,
      max_tokens: 400,
    });

    const text =
      res?.choices?.[0]?.message?.content?.trim() ||
      res?.choices?.[0]?.message?.parts?.map((p) => p?.text || "").join("\n") ||
      null;

    return text;
  } catch (_e) {
    // Silencioso: si algo falla, regresamos null para usar el fallback
    return null;
  }
}

/* ===================== Rutas ===================== */

/**
 * POST /api/assist/chat
 * body: { threadId?: string, message: string, imageUrl?: string, context?: object }
 * devuelve: { ok, threadId, reply }
 */
router.post("/chat", auth, async (req, res) => {
  try {
    const { message, imageUrl, context, temperature } = req.body || {};
    let { threadId } = req.body;

    if (!message && !imageUrl) {
      return res
        .status(400)
        .json({ ok: false, message: "Falta 'message' o 'imageUrl'." });
    }

    if (!threadId) {
      threadId = randomUUID();
      await createThreadService(req.user.id); // Associate with user if possible
    }

    const prompt = buildContextPrompt(message, context);

    // Guarda mensaje del usuario
    await addMessageService({
      threadId,
      role: "user",
      content: prompt || "",
      imageUrl: imageUrl || null
    });

    // Intento con OpenAI (si no, fallback)
    const fromAI =
      (await tryOpenAIResponse({
        prompt,
        imageUrl,
        temperature: Number(temperature) || 0.2
      })) || fallbackReply(message, context);

    // Guarda mensaje del asistente
    await addMessageService({
      threadId,
      role: "assistant",
      content: fromAI
    });

    return res.json({ ok: true, threadId, reply: fromAI });
  } catch (e) {
    console.error("assistant.chat error:", e);
    return res.status(500).json({ ok: false, message: "Assist falló." });
  }
});

/**
 * GET /api/assist/thread/:id
 * devuelve: { ok, data: Message[] }
 */
router.get("/thread/:id", auth, async (req, res) => {
  const id = req.params.id;
  try {
    const thread = await getThreadService(id);
    return res.json({ ok: true, data: thread ? thread.messages : [] });
  } catch (e) {
    return res.json({ ok: true, data: [] });
  }
});

/**
 * POST /api/assist/reset
 * body: { threadId?: string }  (si no envían, vacía todo)
 */
router.post("/reset", auth, async (req, res) => {
  const { threadId } = req.body || {};
  if (threadId) {
    try {
      await clearThreadService(threadId);
    } catch (e) { /* ignore */ }
  }
  return res.json({ ok: true });
});

export default router;
