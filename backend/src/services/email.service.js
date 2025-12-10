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
        port: 465,
        secure: true, // use SSL
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
        // Add timeouts to prevent hanging
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 10000
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
