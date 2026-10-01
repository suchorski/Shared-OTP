import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";

export const sessionUserSelect = {
  id: true,
  cpf: true,
  name: true,
  warName: true,
  rank: true,
  saram: true,
  om: true,
  email: true,
  role: true,
};

export function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// Role is loaded from the DB on every request so revocations apply immediately.
export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) throw new HttpError(401, "Não autenticado");

  let payload;
  try {
    payload = jwt.verify(header.slice(7), config.jwtSecret);
  } catch {
    throw new HttpError(401, "Sessão expirada ou inválida");
  }

  const user = await prisma.user.findUnique({ where: { id: String(payload.sub) }, select: sessionUserSelect });
  if (!user) throw new HttpError(401, "Usuário não encontrado");
  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role)) throw new HttpError(403, "Acesso negado");
    next();
  };
}
