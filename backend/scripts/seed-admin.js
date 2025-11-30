import dotenv from "dotenv";
dotenv.config();
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/hash.js";

const run = async () => {
  const email = "admin@demo.com";
  const name = "Admin";
  const role = "ADMIN";
  const passHash = await hashPassword("admin123");

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log("Admin ya existe");
  } else {
    await prisma.user.create({ data: { email, name, password: passHash, role } });
    console.log("Admin creado:", email, "pass: admin123");
  }
  process.exit(0);
};

run().catch(e => { console.error(e); process.exit(1); });
