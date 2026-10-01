import crypto from "node:crypto";
import { config } from "../config.js";

const VERSION = "v1";

export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", config.encryptionKey, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(":");
}

export function decrypt(payload) {
  const [version, iv, tag, data] = String(payload).split(":");
  if (version !== VERSION) throw new Error("Formato de segredo desconhecido");
  const decipher = crypto.createDecipheriv("aes-256-gcm", config.encryptionKey, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
