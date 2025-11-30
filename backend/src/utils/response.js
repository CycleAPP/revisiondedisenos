export const ok = (res, data = {}, code = 200) => res.status(code).json({ ok: true, data });
export const fail = (res, message = "Error", code = 400) => res.status(code).json({ ok: false, message });
