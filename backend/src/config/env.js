export const env = {
  PORT: process.env.PORT ?? 4000,
  DATABASE_URL: process.env.DATABASE_URL,
  // Default secret to keep demo usable even sin .env
  JWT_SECRET: process.env.JWT_SECRET || "demo-secret",
  JWT_EXPIRES: process.env.JWT_EXPIRES ?? "7d",
  UPLOAD_DIR_EXCEL: process.env.UPLOAD_DIR_EXCEL ?? "./src/uploads/excels",
  UPLOAD_DIR_DESIGN: process.env.UPLOAD_DIR_DESIGN ?? "./src/uploads/designs"
};
