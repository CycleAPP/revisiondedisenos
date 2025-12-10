// Using Resend HTTP API (no SMTP ports required)
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export const sendEmail = async ({ to, subject, html }) => {
    if (!RESEND_API_KEY) {
        console.warn("[Email] RESEND_API_KEY not found. Emails will not be sent.");
        return false;
    }

    try {
        console.log(`[Email] Attempting to send to: ${to}`);

        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: "Diseño Empaque <noreply@designlumina.ciklo.me>",
                to: [to],
                subject,
                html
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("[Email] Sent successfully. ID:", data.id);
            return true;
        } else {
            console.error("[Email] Error:", data);
            return false;
        }
    } catch (e) {
        console.error("[Email] Error sending:", e);
        return false;
    }
};
