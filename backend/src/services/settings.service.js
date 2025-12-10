import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsPath = path.join(__dirname, '../config/ai_settings.json');

export function getStrictness() {
    try {
        if (fs.existsSync(settingsPath)) {
            const raw = fs.readFileSync(settingsPath, 'utf-8');
            const data = JSON.parse(raw);
            return data.strictness || 5;
        }
    } catch (e) {
        console.error("Error reading settings:", e);
    }
    return 5; // Default
}

export function setStrictness(level) {
    try {
        const newLevel = Math.max(1, Math.min(10, Number(level)));
        const data = { strictness: newLevel };
        fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
        return newLevel;
    } catch (e) {
        console.error("Error writing settings:", e);
        throw e;
    }
}
