import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to find .env in backend root or project root
const backendEnv = path.join(__dirname, "../../.env");
const rootEnv = path.join(__dirname, "../../../.env");

if (fs.existsSync(backendEnv)) {
  dotenv.config({ path: backendEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config(); // Fallback to default cwd
}

export const env = {
  PORT: process.env.PORT ?? 4000,
  DATABASE_URL: process.env.DATABASE_URL,
  // Default secret to keep demo usable even sin .env
  JWT_SECRET: process.env.JWT_SECRET || "demo-secret",
  JWT_EXPIRES: process.env.JWT_EXPIRES ?? "7d",
  UPLOAD_DIR_EXCEL: process.env.UPLOAD_DIR_EXCEL ?? "./src/uploads/excels",
  UPLOAD_DIR_DESIGN: process.env.UPLOAD_DIR_DESIGN ?? "./src/uploads/designs"
};
