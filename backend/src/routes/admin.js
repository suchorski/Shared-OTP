import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { HttpError, maskCpf, parsePage, publicUserSelect } from "../lib/http.js";
import { AUDIT_ACTIONS, listAudit, logAudit } from "../lib/audit.js";
import { generateCode } from "../lib/totp.js";
import { findOtpOr404, findUserOr404, revokeShare, transferOtp } from "../lib/otpService.js";
import { adminAuditWhere, adminOtpWhere, adminUserWhere, assertUserInScope, isGlobalAdmin } from "../lib/scope.js";
import { buildUserSearchWhere } from "./users.js";
import { requireRole } from "../middleware/auth.js";

const router = Router();
const ROLES = ["USER", "ADMIN_LOCAL", "ADMIN_GLOBAL"];

function omFilter(req) {
  return isGlobalAdmin(req.user) && req.query.om ? String(req.query.om) : undefined;
}

async function loadOtpInScope(req) {
  const otp = await findOtpOr404(req.params.id);
  assertUserInScope(req.user, otp.owner);
  return otp;
}

router.get("/oms", async (req, res) => {
  if (!isGlobalAdmin(req.user)) return res.json(req.user.om ? [req.user.om] : []);
  const rows = await prisma.user.findMany({
    where: { om: { not: null } },
    distinct: ["om"],
    select: { om: true },
    orderBy: { om: "asc" },
  });
  res.json(rows.map((r) => r.om));
});

router.get("/users", async (req, res) => {
  const pg = parsePage(req.query);
  const and = [adminUserWhere(req.user)];
  if (req.query.q) and.push(buildUserSearchWhere(req.query.q));
  if (omFilter(req)) and.push({ om: omFilter(req) });
  if (ROLES.includes(req.query.role)) and.push({ role: req.query.role });
  const where = { AND: and };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        ...publicUserSelect,
        cpf: true,
        role: true,
        lastLoginAt: true,
        _count: { select: { ownedOtps: true, shares: true } },
      },
      orderBy: [{ om: "asc" }, { warName: "asc" }],
      skip: pg.skip,
      take: pg.take,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    items: users.map(({ cpf, _count, ...u }) => ({
      ...u,
      cpfMasked: maskCpf(cpf),
      ownedCount: _count.ownedOtps,
      sharedWithCount: _count.shares,
    })),
    total,
    page: pg.page,
    pageSize: pg.pageSize,
  });
});

router.put("/users/:id/role", requireRole("ADMIN_GLOBAL"), async (req, res) => {
  const role = req.body?.role;
  if (!ROLES.includes(role)) throw new HttpError(400, "Perfil inválido");
  if (req.params.id === req.user.id) throw new HttpError(400, "Você não pode alterar o próprio perfil");

  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { ...publicUserSelect, role: true } });
  if (!target) throw new HttpError(404, "Usuário não encontrado");
  if (target.role === role) return res.status(204).end();

  await prisma.$transaction(async (tx) => {
    if (target.role === "ADMIN_GLOBAL") {
      const globals = await tx.user.count({ where: { role: "ADMIN_GLOBAL" } });
      if (globals <= 1) throw new HttpError(400, "Não é possível remover o último admin global");
    }
    await tx.user.update({ where: { id: target.id }, data: { role } });
    await logAudit(req, { action: "ROLE_CHANGE", target, ownerOm: target.om, details: { from: target.role, to: role } }, tx);
  });
  res.status(204).end();
});

router.get("/otps", async (req, res) => {
  const pg = parsePage(req.query);
  const and = [adminOtpWhere(req.user)];
  const q = String(req.query.q || "").trim();
  if (q) {
    and.push({
      OR: [
        { name: { contains: q } },
        { issuer: { contains: q } },
        { owner: { OR: [{ name: { contains: q } }, { warName: { contains: q } }] } },
      ],
    });
  }
  if (omFilter(req)) and.push({ owner: { om: omFilter(req) } });
  if (req.query.ownerId) and.push({ ownerId: String(req.query.ownerId) });
  if (req.query.userId) {
    const userId = String(req.query.userId);
    and.push({ OR: [{ ownerId: userId }, { shares: { some: { userId } } }] });
  }
  const where = { AND: and };

  const [otps, total] = await Promise.all([
    prisma.otp.findMany({
      where,
      include: {
        owner: { select: publicUserSelect },
        shares: { include: { user: { select: publicUserSelect } }, orderBy: { createdAt: "asc" } },
      },
      orderBy: [{ name: "asc" }],
      skip: pg.skip,
      take: pg.take,
    }),
    prisma.otp.count({ where }),
  ]);

  res.json({
    items: otps.map((o) => ({
      id: o.id,
      name: o.name,
      issuer: o.issuer,
      digits: o.digits,
      period: o.period,
      algorithm: o.algorithm,
      owner: o.owner,
      shares: o.shares.map((s) => ({ user: s.user, createdAt: s.createdAt })),
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    })),
    total,
    page: pg.page,
    pageSize: pg.pageSize,
  });
});

router.get("/otps/:id/code", async (req, res) => {
  const otp = await loadOtpInScope(req);
  await logAudit(req, { action: "ADMIN_VIEW_CODE", otp });
  res.json(generateCode(otp));
});

router.delete("/otps/:id/shares/:userId", async (req, res) => {
  const otp = await loadOtpInScope(req);
  await revokeShare(req, otp, req.params.userId, { asAdmin: true });
  res.status(204).end();
});

router.post("/otps/:id/transfer", async (req, res) => {
  const otp = await loadOtpInScope(req);
  const target = await findUserOr404(req.body?.userId);
  assertUserInScope(req.user, target);
  await transferOtp(req, otp, target, {
    keepPreviousOwnerAccess: req.body?.keepPreviousOwnerAccess !== false,
    asAdmin: true,
  });
  res.status(204).end();
});

router.get("/audit", async (req, res) => {
  const and = [adminAuditWhere(req.user)];
  const { action, userId, otpId, from, to } = req.query;
  if (AUDIT_ACTIONS.includes(action)) and.push({ action });
  if (omFilter(req)) and.push({ OR: [{ actorOm: omFilter(req) }, { ownerOm: omFilter(req) }] });
  if (userId) and.push({ OR: [{ actorId: String(userId) }, { targetUserId: String(userId) }] });
  if (otpId) and.push({ otpId: String(otpId) });
  const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
  const createdAt = {};
  if (isDate(from)) createdAt.gte = new Date(`${from}T00:00:00`);
  if (isDate(to)) createdAt.lte = new Date(`${to}T23:59:59.999`);
  if (Object.keys(createdAt).length) and.push({ createdAt });

  res.json(await listAudit({ AND: and }, parsePage(req.query)));
});

export default router;
