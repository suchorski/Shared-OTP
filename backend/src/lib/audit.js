import { prisma } from "./prisma.js";

export const AUDIT_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "OTP_CREATE",
  "OTP_UPDATE",
  "OTP_DELETE",
  "OTP_SHARE",
  "OTP_UNSHARE",
  "OTP_TRANSFER",
  "OTP_COPY",
  "ADMIN_VIEW_CODE",
  "ROLE_CHANGE",
];

function requestMeta(req) {
  return {
    ip: req?.ip ? String(req.ip).slice(0, 64) : null,
    userAgent: req?.get?.("user-agent")?.slice(0, 255) || null,
  };
}

/**
 * With `tx`, failures propagate so the surrounding mutation rolls back;
 * without it, audit errors are logged and swallowed.
 */
export async function logAudit(req, { action, actor = req?.user, actorCpf, otp, ownerOm, target, details }, tx) {
  const data = {
    action,
    actorId: actor?.id ?? null,
    actorCpf: actor?.cpf ?? actorCpf ?? null,
    actorOm: actor?.om ?? null,
    otpId: otp?.id ?? null,
    otpName: otp?.name ?? null,
    ownerOm: ownerOm ?? otp?.owner?.om ?? null,
    targetUserId: target?.id ?? null,
    details: details ?? undefined,
    ...requestMeta(req),
  };

  if (tx) {
    await tx.auditLog.create({ data });
    return;
  }
  try {
    await prisma.auditLog.create({ data });
  } catch (err) {
    console.error("Falha ao registrar auditoria:", action, err.message);
  }
}

const userBrief = { select: { id: true, name: true, warName: true, rank: true, om: true } };

export const auditInclude = { actor: userBrief, targetUser: userBrief };

export async function listAudit(where, { skip, take, page, pageSize }) {
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where, include: auditInclude, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total, page, pageSize };
}
