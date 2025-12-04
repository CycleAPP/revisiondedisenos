import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root (parent of backend)
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log("Testing Email...");
console.log("SMTP_EMAIL:", process.env.SMTP_EMAIL);
console.log("SMTP_PASSWORD:", process.env.SMTP_PASSWORD ? "****" : "MISSING");

async function main() {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.error("Missing credentials in .env");
        return;
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: `"Test" <${process.env.SMTP_EMAIL}>`,
            to: process.env.SMTP_EMAIL, // Send to self
            subject: "Test Email from Server",
            text: "If you see this, emails are working!",
        });
        console.log("Email sent successfully:", info.messageId);
    } catch (e) {
        console.error("Error sending email:", e);
    }
}

main();
