import "dotenv/config";

function getEnv(name, fallback = "") {
  return process.env[name] || fallback;
}

function getBooleanEnv(name, fallback = false) {
  const value = String(getEnv(name, fallback ? "true" : "false")).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

// Attribute names end up inside LDAP filters, so only allow safe identifiers.
function getAttrEnv(name, fallback) {
  const value = getEnv(name, fallback);
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value) ? value : fallback;
}

function required(name) {
  const value = getEnv(name);
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  return value;
}

function loadEncryptionKey() {
  const key = Buffer.from(required("OTP_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) {
    throw new Error("OTP_ENCRYPTION_KEY deve ter 32 bytes em base64 (openssl rand -base64 32)");
  }
  return key;
}

const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32) throw new Error("JWT_SECRET deve ter ao menos 32 caracteres");

const ldapBaseDn = getEnv("LDAP_BASE_DN");

export const config = {
  port: Number(getEnv("PORT", "7126")),
  bindHost: getEnv("BIND_HOST", "0.0.0.0"),
  nodeEnv: getEnv("NODE_ENV", "production"),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret,
  jwtExpiresIn: "12h",
  encryptionKey: loadEncryptionKey(),
  frontendOrigins: getEnv("FRONTEND_URL")
    .split(",")
    .map((v) => v.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  testMode: getBooleanEnv("TEST_MODE", false),
  ldap: {
    url: getEnv("LDAP_URL"),
    bindDn: getEnv("LDAP_BIND_DN"),
    bindPassword: getEnv("LDAP_BIND_PASSWORD"),
    userBaseDn: getEnv("LDAP_USER_BASE_DN", `ou=contas,${ldapBaseDn}`),
    timeoutMs: Number(getEnv("LDAP_TIMEOUT_MS", "10000")),
    attrs: {
      uid: getAttrEnv("LDAP_UID_ATTRIBUTE", "uid"),
      saram: getAttrEnv("LDAP_SARAM_ATTRIBUTE", "FABnrordem"),
      mail: getAttrEnv("LDAP_MAIL_ATTRIBUTE", "mail"),
      name: getAttrEnv("LDAP_NAME_ATTRIBUTE", "cn"),
      om: getAttrEnv("LDAP_OM_ATTRIBUTE", "FABomprest"),
      rank: getAttrEnv("LDAP_RANK_ATTRIBUTE", "FABpostograd"),
      warName: getAttrEnv("LDAP_WARNAME_ATTRIBUTE", "FABguerra"),
    },
  },
};
