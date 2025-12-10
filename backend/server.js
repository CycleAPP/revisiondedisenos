// backend/server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mountOrDummy from "./src/utils/mountOrDummy.js";
import { securityHeaders, apiLimiter, authLimiter } from "./src/middlewares/security.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env (fallback to backend/.env)
const envCandidates = [
  path.join(__dirname, ".env"),
  path.join(__dirname, "..", ".env"),
];
envCandidates.forEach((p) => {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: false });
  }
});

const app = express();

// Security Middlewares
app.use(securityHeaders);

// Middlewares básicos
app.use(cors()); // TODO: Configure strict CORS in production
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);

/* ------------------ Montaje de rutas con fallback ------------------ */
/**
 * OJO: mountOrDummy(relativePath) ya se encarga de:
 *  - Resolver el path real al archivo
 *  - Hacer import dinámico
 *  - Si falla, devolver un Router dummy que responde 501
 *
 * En la consola verás:
 *  ✅ Ruta cargada: ./src/routes/xxx.routes.js
 *  o
 *  [AVISO] ./src/routes/xxx.routes.js no disponible. ...
 */

const routesBase = path.join(__dirname, "src/routes");

const authRoutes = await mountOrDummy(`${routesBase}/auth.routes.js`);
const usersRoutes = await mountOrDummy(`${routesBase}/users.routes.js`);
const teamsRoutes = await mountOrDummy(`${routesBase}/teams.routes.js`);
const assignmentsRoutes = await mountOrDummy(`${routesBase}/assignments.routes.js`);
const filesRoutes = await mountOrDummy(`${routesBase}/files.routes.js`);
const expectedRoutes = await mountOrDummy(`${routesBase}/expected.routes.js`);
const validateRoutes = await mountOrDummy(`${routesBase}/validate.routes.js`);
const mappingsRoutes = await mountOrDummy(`${routesBase}/mappings.routes.js`);
const assistantRoutes = await mountOrDummy(`${routesBase}/assistant.routes.js`);
const metricsRoutes = await mountOrDummy(`${routesBase}/metrics.routes.js`);
const reviewRoutes = await mountOrDummy(`${routesBase}/review.routes.js`);

// Prefijo de API
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/assignments", assignmentsRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/expected", expectedRoutes);
app.use("/api/validate", validateRoutes);
app.use("/api/mappings", mappingsRoutes);
app.use("/api/assist", assistantRoutes);
app.use("/api/metrics", metricsRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/templates", await mountOrDummy(`${routesBase}/templates.routes.js`));

/* ------------------ Estáticos (uploads + frontend) ------------------ */

// Carpeta donde se guardan los diseños / imágenes que sube el diseñador
app.use("/uploads", express.static(path.join(__dirname, "src/uploads")));

// Frontend (index.html + app.js + ui.css dentro de /frontend)
app.use("/", express.static(path.join(__dirname, "..", "frontend")));

/* ------------------ Healthcheck ------------------ */
app.get("/health", (_req, res) => {
  res.json({ ok: true, status: "up" });
});

/* ------------------ Arranque ------------------ */
const PORT = process.env.PORT || 4040;

async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`✅ API: http://localhost:${PORT}`);
      console.log(`🖥️  UI : http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

startServer();
