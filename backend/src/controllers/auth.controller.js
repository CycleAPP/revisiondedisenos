import { ok, fail } from "../utils/response.js";
import { registerService, loginService } from "../services/auth.service.js";

export const register = async (req, res) => {
  try {
    const user = await registerService(req.body);
    return ok(res, { id: user.id, email: user.email, name: user.name, role: user.role }, 201);
  } catch (e) {
    return fail(res, e.message, 400);
  }
};

export const login = async (req, res) => {
  try {
    const data = await loginService(req.body);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message, 401);
  }
};
