import * as OTPAuth from "otpauth";
import { decrypt } from "./crypto.js";
import { HttpError } from "./http.js";

export const ALGORITHMS = ["SHA1", "SHA256", "SHA512"];

export function normalizeSecret(value) {
  const secret = String(value || "")
    .replace(/[\s-]/g, "")
    .replace(/=+$/, "")
    .toUpperCase();
  if (secret.length < 16 || secret.length > 256 || !/^[A-Z2-7]+$/.test(secret)) {
    throw new HttpError(400, "Segredo inválido: informe a chave base32 (letras A-Z e números 2-7, mínimo 16 caracteres)");
  }
  return secret;
}

export function validateParams({ algorithm = "SHA1", digits = 6, period = 30 } = {}) {
  const alg = String(algorithm).toUpperCase();
  const dig = Number(digits);
  const per = Number(period);
  if (!ALGORITHMS.includes(alg)) throw new HttpError(400, "Algoritmo inválido");
  if (!Number.isInteger(dig) || dig < 6 || dig > 8) throw new HttpError(400, "Dígitos deve ser entre 6 e 8");
  if (!Number.isInteger(per) || per < 15 || per > 120) throw new HttpError(400, "Período deve ser entre 15 e 120 segundos");
  return { algorithm: alg, digits: dig, period: per };
}

export function generateCode(otp, now = Date.now()) {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(decrypt(otp.secretEnc)),
    algorithm: otp.algorithm,
    digits: otp.digits,
    period: otp.period,
  });
  const seconds = Math.floor(now / 1000);
  return {
    id: otp.id,
    code: totp.generate({ timestamp: now }),
    period: otp.period,
    remaining: otp.period - (seconds % otp.period),
  };
}
