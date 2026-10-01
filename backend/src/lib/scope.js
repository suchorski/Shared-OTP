import { HttpError } from "./http.js";

export const isGlobalAdmin = (user) => user?.role === "ADMIN_GLOBAL";
export const isLocalAdmin = (user) => user?.role === "ADMIN_LOCAL";

function localOm(user) {
  if (!user.om) throw new HttpError(403, "Admin local sem OM definida no LDAP");
  return user.om;
}

export function adminUserWhere(user) {
  return isGlobalAdmin(user) ? {} : { om: localOm(user) };
}

export function adminOtpWhere(user) {
  return isGlobalAdmin(user) ? {} : { owner: { om: localOm(user) } };
}

export function adminAuditWhere(user) {
  if (isGlobalAdmin(user)) return {};
  const om = localOm(user);
  return { OR: [{ actorOm: om }, { ownerOm: om }] };
}

export function assertUserInScope(admin, target) {
  if (isGlobalAdmin(admin)) return;
  if (!target || target.om !== localOm(admin)) throw new HttpError(403, "Usuário fora da sua OM");
}
