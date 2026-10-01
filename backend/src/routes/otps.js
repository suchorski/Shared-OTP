import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { HttpError, parsePage, publicUserSelect } from "../lib/http.js";
import { encrypt } from "../lib/crypto.js";
import { generateCode, normalizeSecret, validateParams } from "../lib/totp.js";
import { listAudit, logAudit } from "../lib/audit.js";
import { findOtpOr404, findUserOr404, revokeShare, transferOtp } from "../lib/otpService.js";

const router = Router();

function toDto(otp, userId) {
  const isOwner = otp.ownerId === userId;
  const myShare = isOwner ? null : otp.shares?.find((s) => s.userId === userId);
  return {
    id: otp.id,
    name: otp.name,
    issuer: otp.issuer,
    algorithm: otp.algorithm,
    digits: otp.digits,
    period: otp.period,
    access: isOwner ? "owner" : "viewer",
    owner: otp.owner,
    sharedBy: myShare?.sharedBy ?? null,
    shareCount: isOwner ? otp._count?.shares ?? 0 : undefined,
    createdAt: otp.createdAt,
    updatedAt: otp.updatedAt,
  };
}

function accessibleWhere(userId) {
  return { OR: [{ ownerId: userId }, { shares: { some: { userId } } }] };
}

async function loadOwned(req) {
  const otp = await findOtpOr404(req.params.id);
  if (otp.ownerId !== req.user.id) throw new HttpError(403, "Somente o dono pode fazer isso");
  return otp;
}

async function loadAccessible(req) {
  const otp = await prisma.otp.findFirst({
    where: { id: String(req.params.id), ...accessibleWhere(req.user.id) },
    include: { owner: { select: publicUserSelect } },
  });
  if (!otp) throw new HttpError(404, "OTP não encontrado");
  return otp;
}

function readText(value, label, max, { required = false } = {}) {
  const text = String(value ?? "").trim();
  if (required && !text) throw new HttpError(400, `${label} é obrigatório`);
  if (text.length > max) throw new HttpError(400, `${label} deve ter no máximo ${max} caracteres`);
  return text || null;
}

router.get("/", async (req, res) => {
  const userId = req.user.id;
  const otps = await prisma.otp.findMany({
    where: accessibleWhere(userId),
    include: {
      owner: { select: publicUserSelect },
      shares: { where: { userId }, include: { sharedBy: { select: publicUserSelect } } },
      _count: { select: { shares: true } },
    },
    orderBy: { name: "asc" },
  });
  res.json(otps.map((otp) => toDto(otp, userId)));
});

router.get("/codes", async (req, res) => {
  const otps = await prisma.otp.findMany({ where: accessibleWhere(req.user.id) });
  const now = Date.now();
  res.json(otps.map((otp) => generateCode(otp, now)));
});

router.post("/", async (req, res) => {
  const body = req.body || {};
  const data = {
    name: readText(body.name, "Nome", 100, { required: true }),
    issuer: readText(body.issuer, "Emissor", 100),
    secretEnc: encrypt(normalizeSecret(body.secret)),
    ...validateParams(body),
    ownerId: req.user.id,
  };

  const otp = await prisma.$transaction(async (tx) => {
    const created = await tx.otp.create({ data });
    await logAudit(req, { action: "OTP_CREATE", otp: created, ownerOm: req.user.om }, tx);
    return created;
  });
  res.status(201).json({ id: otp.id });
});

router.put("/:id", async (req, res) => {
  const otp = await loadOwned(req);
  const body = req.body || {};
  const data = {
    name: readText(body.name, "Nome", 100, { required: true }),
    issuer: readText(body.issuer, "Emissor", 100),
    ...validateParams({
      algorithm: body.algorithm ?? otp.algorithm,
      digits: body.digits ?? otp.digits,
      period: body.period ?? otp.period,
    }),
  };
  const secretChanged = Boolean(String(body.secret || "").trim());
  if (secretChanged) data.secretEnc = encrypt(normalizeSecret(body.secret));

  await prisma.$transaction(async (tx) => {
    const updated = await tx.otp.update({ where: { id: otp.id }, data });
    await logAudit(
      req,
      { action: "OTP_UPDATE", otp: updated, ownerOm: otp.owner.om, details: { previousName: otp.name, secretChanged } },
      tx
    );
  });
  res.status(204).end();
});

router.delete("/:id", async (req, res) => {
  const otp = await loadOwned(req);
  await prisma.$transaction(async (tx) => {
    await logAudit(req, { action: "OTP_DELETE", otp }, tx);
    await tx.otp.delete({ where: { id: otp.id } });
  });
  res.status(204).end();
});

router.post("/:id/copy", async (req, res) => {
  const otp = await loadAccessible(req);
  await logAudit(req, { action: "OTP_COPY", otp });
  res.status(204).end();
});

router.get("/:id/shares", async (req, res) => {
  const otp = await loadOwned(req);
  const shares = await prisma.otpShare.findMany({
    where: { otpId: otp.id },
    include: { user: { select: publicUserSelect }, sharedBy: { select: publicUserSelect } },
    orderBy: { createdAt: "asc" },
  });
  res.json(shares.map((s) => ({ user: s.user, sharedBy: s.sharedBy, createdAt: s.createdAt })));
});

router.post("/:id/shares", async (req, res) => {
  const otp = await loadOwned(req);
  const target = await findUserOr404(req.body?.userId);
  if (target.id === otp.ownerId) throw new HttpError(400, "Você já é o dono deste OTP");

  const existing = await prisma.otpShare.findUnique({ where: { otpId_userId: { otpId: otp.id, userId: target.id } } });
  if (existing) throw new HttpError(409, "OTP já compartilhado com essa pessoa");

  await prisma.$transaction(async (tx) => {
    await tx.otpShare.create({ data: { otpId: otp.id, userId: target.id, sharedById: req.user.id } });
    await logAudit(req, { action: "OTP_SHARE", otp, target }, tx);
  });
  res.status(201).end();
});

router.delete("/:id/shares/:userId", async (req, res) => {
  const otp = await loadOwned(req);
  await revokeShare(req, otp, req.params.userId);
  res.status(204).end();
});

router.post("/:id/transfer", async (req, res) => {
  const otp = await loadOwned(req);
  const target = await findUserOr404(req.body?.userId);
  await transferOtp(req, otp, target, { keepPreviousOwnerAccess: true });
  res.status(204).end();
});

router.get("/:id/audit", async (req, res) => {
  const otp = await loadOwned(req);
  res.json(await listAudit({ otpId: otp.id }, parsePage(req.query)));
});

export default router;
