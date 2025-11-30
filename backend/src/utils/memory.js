// backend/src/utils/memory.js
import { randomUUID } from "crypto";

export const db = {
  users: [
    { id: 1, name: "Admin", email: "admin@demo.com", role: "ADMIN", teamId: null, password: "admin123" },
    { id: 2, name: "Líder", email: "leader@demo.com", role: "LEADER", teamId: 1, password: "leader123" },
    { id: 3, name: "Diseñador", email: "designer@demo.com", role: "DESIGNER", teamId: 1, password: "designer123" },
  ],
  teams: [{ id: 1, name: "Equipo A" }],
  assignments: [
    { id: 101, modelKey: "SKU-001", title: "Etiqueta 250g", description: "V1", status: "NEW", assigneeId: 3, createdById: 2, createdAt: new Date().toISOString() },
  ],
  templates: [],
  // revisiones/validaciones que ve el admin
  reviews: [
    { id: 1, modelKey: "SKU-001", status: "OK", createdAt: new Date().toISOString(), details: { notes: "Todo correcto" } },
  ],
  // archivos por SKU
  filesByModelKey: {
    "SKU-001": [
      { type: "design", filename: "ejemplo.png", url: "/uploads/ejemplo.png", createdAt: new Date().toISOString() },
    ],
  },
  files: [],
  // textos requeridos por SKU (simula el Excel)
  requiredByModelKey: {
    "SKU-001": [
      { field: "Nombre Producto", required: true },
      { field: "Peso Neto", required: true },
      { field: "Ingredientes", required: true },
      { field: "Lote", required: false },
      { field: "Fecha Caducidad", required: true },
    ],
  },
  // hilos del asistente (chat)
  threads: {
    // threadId: [{role, content, createdAt}]
  },
  // métricas simples
  metrics: {
    errorCounters: {
      // tipoError: cantidad
      "OCR_MISSING_FIELD": 2,
      "TEXT_MISMATCH": 1,
    },
    efficiencyByUser: {
      // userId: { repairedTimeMsAcum, tasksDone, lastCalcAt }
      3: { repairedTimeMsAcum: 14 * 60 * 1000, tasksDone: 2, lastCalcAt: Date.now() },
    },
    hardestDesigns: {
      // modelKey: contadorDeFallas
      "SKU-001": 1,
    },
  },
};

export function nextId(collection) {
  const max = collection.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
  return max + 1;
}

export function newThreadId() {
  return randomUUID();
}
