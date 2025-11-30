import bcrypt from "bcrypt";
const ROUNDS = 10;
export const hashPassword = async (plain) => bcrypt.hash(plain, ROUNDS);
export const comparePassword = async (plain, hashed) => bcrypt.compare(plain, hashed);
