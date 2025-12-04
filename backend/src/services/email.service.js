import nodemailer from "nodemailer";

let transporter = null;

const initTransporter = () => {
    if (transporter) return transporter;

    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.warn("[Email] SMTP credentials not found. Emails will not be sent.");
        return null;
    }

    transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });
    return transporter;
};

export const sendEmail = async ({ to, subject, html }) => {
    const t = initTransporter();
    if (!t) return false;

    try {
        const info = await t.sendMail({
            from: `"Diseño Empaque" <${process.env.SMTP_EMAIL}>`,
            to,
            subject,
            html,
        });
        console.log("[Email] Sent:", info.messageId);
        return true;
    } catch (e) {
        console.error("[Email] Error sending:", e);
        return false;
    }
};
