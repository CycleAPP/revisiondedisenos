import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Configure Helmet for secure HTTP headers
// Disable CSP for now to allow external scripts (unpkg, jsdelivr)
export const securityHeaders = helmet({
    contentSecurityPolicy: false,
});

// General API Rate Limiter
// 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ok: false,
        message: "Demasiadas peticiones desde esta IP, por favor intente de nuevo más tarde."
    }
});

// Stricter Auth Rate Limiter (Login/Register)
// 10 requests per hour per IP to prevent brute force
export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ok: false,
        message: "Demasiados intentos de inicio de sesión, por favor intente de nuevo en una hora."
    }
});
