import { Router } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { HttpError, onlyDigits } from "../lib/http.js";
import { findUserByCpf, validatePassword } from "../lib/ldap.js";
import { logAudit } from "../lib/audit.js";
import { requireAuth, sessionUserSelect, signToken } from "../middleware/auth.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Muitas tentativas de login. Tente novamente em alguns minutos." },
});

const INVALID = "CPF ou senha inválidos";

router.post("/login", loginLimiter, async (req, res) => {
  const cpf = onlyDigits(req.body?.cpf);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (cpf.length !== 11) throw new HttpError(400, "Informe um CPF válido (11 dígitos)");
  if (!password && !config.testMode) throw new HttpError(400, "Informe a senha");

  let ldapUser;
  try {
    ldapUser = await findUserByCpf(cpf);
  } catch (err) {
    console.error("Erro no LDAP:", err.message);
    throw new HttpError(503, "Serviço de autenticação indisponível");
  }

  const authenticated = ldapUser && (config.testMode || (await validatePassword(ldapUser.dn, password)));
  if (!authenticated) {
    await logAudit(req, { action: "LOGIN_FAILED", actor: null, actorCpf: cpf, details: { reason: ldapUser ? "password" : "not_found" } });
    throw new HttpError(401, INVALID);
  }

  const profile = {
    name: ldapUser.name,
    warName: ldapUser.warName,
    saram: ldapUser.saram,
    rank: ldapUser.rank,
    om: ldapUser.om,
    email: ldapUser.email,
    lastLoginAt: new Date(),
  };
  const user = await prisma.user.upsert({
    where: { cpf },
    update: profile,
    create: { cpf, ...profile },
    select: sessionUserSelect,
  });

  await logAudit(req, { action: "LOGIN_SUCCESS", actor: user });
  res.json({ token: signToken(user.id), user });
});

router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

export default router;
