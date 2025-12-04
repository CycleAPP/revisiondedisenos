import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Attempting to import users.routes.js...");

try {
    await import("./src/routes/users.routes.js");
    console.log("SUCCESS: users.routes.js loaded correctly.");
} catch (e) {
    console.error("FAILURE: Could not load users.routes.js");
    console.error(e);
}
