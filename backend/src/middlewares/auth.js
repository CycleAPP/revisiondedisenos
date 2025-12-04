import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import prisma from "../config/prisma.js";

export const auth = async (req, res, next) => {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim() || req.query.token;
  if (!token) return res.status(401).json({ ok: false, message: "No token" });

  // Soporte para token de demo plano (sin JWT)
  if (token === "demo-token") {
    try {
      const fallbackUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
      req.user = fallbackUser || { id: 0, role: "ADMIN", email: "demo@demo.com", name: "Demo" };
      return next();
    } catch (e) {
      return res.status(500).json({ ok: false, message: "Error de autenticación" });
    }
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET || "demo-secret");
    req.user = payload; // { id, role, email, name }
    next();
  } catch {
    return res.status(401).json({ ok: false, message: "Token inválido" });
  }
};
