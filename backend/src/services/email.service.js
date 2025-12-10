import nodemailer from "nodemailer";

// Remove global transporter to prevent stale connections
// let transporter = null;

const createTransporter = () => {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.warn("[Email] SMTP credentials not found. Emails will not be sent.");
        return null;
    }

    return nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // use STARTTLS
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
        // Add timeouts to prevent hanging
        connectionTimeout: 30000, // 30 seconds
        greetingTimeout: 30000,
        socketTimeout: 30000,
        // Force IPv4 to avoid IPv6 timeout issues
        family: 4,
        tls: {
            rejectUnauthorized: false
        }
    });
};

export const sendEmail = async ({ to, subject, html }) => {
    const t = createTransporter();
    if (!t) return false;

    try {
        console.log(`[Email] Attempting to send to: ${to}`);
        const info = await t.sendMail({
            from: `"Diseño Empaque" <${process.env.SMTP_EMAIL}>`,
            to,
            subject,
            html,
        });
        console.log("[Email] Sent successfully. MessageID:", info.messageId);
        return true;
    } catch (e) {
        console.error("[Email] Error sending:", e);
        // Log more details if available
        if (e.response) console.error("[Email] SMTP Response:", e.response);
        return false;
    }
};
