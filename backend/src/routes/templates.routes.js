import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { auth } from "../middlewares/auth.js";
import { listTemplatesService, createTemplateService, deleteTemplateService, getTemplateByIdService } from "../services/templates.service.js";

const router = Router();

// Configure Multer for .ai files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), "archivosdelumina", "templates");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, "template-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// GET /api/templates
router.get("/", auth, async (req, res) => {
    try {
        const data = await listTemplatesService();
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, message: e.message });
    }
});

// POST /api/templates
router.post("/", auth, upload.single("file"), async (req, res) => {
    if (req.user.role !== "LEADER" && req.user.role !== "ADMIN") {
        return res.status(403).json({ ok: false, message: "No autorizado" });
    }

    if (!req.file) return res.status(400).json({ ok: false, message: "No se subió archivo" });

    const { type, name } = req.body;

    try {
        const newTemplate = await createTemplateService({
            name: name || req.file.originalname,
            type: type || "General",
            filename: req.file.filename,
            path: "archivosdelumina/templates/" + req.file.filename,
            uploadedById: req.user.id
        });
        res.json({ ok: true, data: newTemplate });
    } catch (e) {
        res.status(500).json({ ok: false, message: e.message });
    }
});

// DELETE /api/templates/:id
router.delete("/:id", auth, async (req, res) => {
    if (req.user.role !== "LEADER" && req.user.role !== "ADMIN") {
        return res.status(403).json({ ok: false, message: "No autorizado" });
    }

    try {
        const id = Number(req.params.id);
        const t = await getTemplateByIdService(id);
        if (!t) return res.status(404).json({ ok: false, message: "Template no encontrado" });

        const filePath = path.join(process.cwd(), "archivosdelumina", "templates", t.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await deleteTemplateService(id);
        res.json({ ok: true, message: "Eliminado" });
    } catch (e) {
        res.status(500).json({ ok: false, message: e.message });
    }
});

// GET /api/templates/download/:id
router.get("/download/:id", auth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const t = await getTemplateByIdService(id);
        if (!t) return res.status(404).json({ ok: false, message: "Template no encontrado" });

        const filePath = path.join(process.cwd(), "archivosdelumina", "templates", t.filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, message: "Archivo no existe en disco" });

        res.download(filePath, t.originalName);
    } catch (e) {
        res.status(500).json({ ok: false, message: e.message });
    }
});

export default router;
