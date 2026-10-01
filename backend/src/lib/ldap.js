import ldapjs from "ldapjs";
import { config } from "../config.js";

const { ldap } = config;

function escapeLdapFilterValue(value) {
  return String(value)
    .replace(/\\/g, "\\5c")
    .replace(/\*/g, "\\2a")
    .replace(/\(/g, "\\28")
    .replace(/\)/g, "\\29")
    .replace(/\0/g, "\\00");
}

function createClient() {
  const client = ldapjs.createClient({
    url: ldap.url,
    timeout: ldap.timeoutMs,
    connectTimeout: ldap.timeoutMs,
  });
  // Without a listener, connection errors crash the process.
  client.on("error", () => {});
  return client;
}

function bindAsync(client, dn, password) {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (err) => (err ? reject(err) : resolve()));
  });
}

function unbindSafe(client) {
  return new Promise((resolve) => {
    try {
      client.unbind(() => resolve());
    } catch {
      resolve();
    }
  });
}

function firstValue(value) {
  if (Array.isArray(value)) return value[0] || "";
  if (value === undefined || value === null) return "";
  return String(value);
}

function buildAttributeMap(item) {
  const map = {};
  for (const [key, value] of Object.entries(item?.object || {})) {
    if (key === "controls") continue;
    map[key.toLowerCase()] = value;
  }
  for (const attribute of item?.attributes || []) {
    const key = String(attribute?.type || "").toLowerCase();
    if (!key) continue;
    const raw = attribute?.values ?? attribute?.vals;
    const values = Array.isArray(raw) ? raw : [raw];
    map[key] = values.filter((v) => v !== undefined && v !== null).map(String);
  }
  return map;
}

function read(map, attr) {
  return firstValue(map?.[attr.toLowerCase()]).trim() || null;
}

function parseEmail(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

export async function findUserByCpf(cpf) {
  const client = createClient();
  const { attrs } = ldap;
  const filter = `(${attrs.uid}=${escapeLdapFilterValue(cpf)})`;

  try {
    await bindAsync(client, ldap.bindDn, ldap.bindPassword);

    return await new Promise((resolve, reject) => {
      client.search(
        ldap.userBaseDn,
        { filter, scope: "sub", attributes: Object.values(attrs), paged: false },
        (err, res) => {
          if (err) return reject(err);
          let found = null;

          res.on("searchEntry", (item) => {
            const map = buildAttributeMap(item);
            found = {
              dn: item.objectName?.toString?.() || item.dn?.toString?.() || item.pojo?.objectName || "",
              cpf: read(map, attrs.uid),
              name: read(map, attrs.name),
              email: parseEmail(read(map, attrs.mail)),
              rank: read(map, attrs.rank),
              saram: read(map, attrs.saram),
              om: read(map, attrs.om),
              warName: read(map, attrs.warName),
            };
          });
          res.on("error", (searchErr) => {
            if (searchErr?.name === "SizeLimitExceededError") return resolve(found);
            reject(searchErr);
          });
          res.on("end", () => resolve(found));
        }
      );
    });
  } finally {
    await unbindSafe(client);
  }
}

export async function validatePassword(dn, password) {
  // An empty password would be an anonymous bind, which LDAP accepts.
  if (!dn || !password) return false;
  const client = createClient();
  try {
    await bindAsync(client, dn, password);
    return true;
  } catch {
    return false;
  } finally {
    await unbindSafe(client);
  }
}
