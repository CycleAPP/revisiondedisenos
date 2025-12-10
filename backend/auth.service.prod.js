import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const loginService = async ({ email, password }) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Credenciales inválidas");

    // Compare provided password with stored hash
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error("Password incorrecto");

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        env.JWT_SECRET || "demo-secret",
        { expiresIn: env.JWT_EXPIRES || "7d" }
    );

    return { token, user };
};

export const registerService = async ({ name, email, password, role, teamId }) => {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("Email ya existe");

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role: role || "DESIGNER",
            teamId: teamId ? Number(teamId) : null
        }
    });

    return user;
};
