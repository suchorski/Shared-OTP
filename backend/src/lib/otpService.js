import { prisma } from "./prisma.js";
import { HttpError, publicUserSelect } from "./http.js";
import { logAudit } from "./audit.js";

export const otpOwnerInclude = { owner: { select: publicUserSelect } };

export async function findOtpOr404(id, include = otpOwnerInclude) {
  const otp = await prisma.otp.findUnique({ where: { id: String(id) }, include });
  if (!otp) throw new HttpError(404, "OTP não encontrado");
  return otp;
}

export async function findUserOr404(id) {
  const user = await prisma.user.findUnique({ where: { id: String(id || "") }, select: publicUserSelect });
  if (!user) throw new HttpError(404, "Usuário não encontrado");
  return user;
}

export async function revokeShare(req, otp, userId, { asAdmin = false } = {}) {
  const share = await prisma.otpShare.findUnique({
    where: { otpId_userId: { otpId: otp.id, userId: String(userId) } },
    include: { user: { select: publicUserSelect } },
  });
  if (!share) throw new HttpError(404, "Compartilhamento não encontrado");

  await prisma.$transaction(async (tx) => {
    await tx.otpShare.delete({ where: { id: share.id } });
    await logAudit(req, { action: "OTP_UNSHARE", otp, target: share.user, details: asAdmin ? { asAdmin } : undefined }, tx);
  });
}

export async function transferOtp(req, otp, newOwner, { keepPreviousOwnerAccess = true, asAdmin = false } = {}) {
  if (newOwner.id === otp.ownerId) throw new HttpError(400, "Essa pessoa já é a dona do OTP");

  await prisma.$transaction(async (tx) => {
    await tx.otp.update({ where: { id: otp.id }, data: { ownerId: newOwner.id } });
    await tx.otpShare.deleteMany({ where: { otpId: otp.id, userId: newOwner.id } });
    if (keepPreviousOwnerAccess) {
      await tx.otpShare.upsert({
        where: { otpId_userId: { otpId: otp.id, userId: otp.ownerId } },
        update: {},
        create: { otpId: otp.id, userId: otp.ownerId, sharedById: req.user.id },
      });
    }
    await logAudit(
      req,
      {
        action: "OTP_TRANSFER",
        otp,
        ownerOm: otp.owner?.om,
        target: newOwner,
        details: { previousOwnerId: otp.ownerId, newOwnerOm: newOwner.om, keepPreviousOwnerAccess, ...(asAdmin && { asAdmin }) },
      },
      tx
    );
  });
}
