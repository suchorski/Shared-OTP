export function userLabel(user) {
  if (!user) return "—";
  const short = [user.rank, user.warName].filter(Boolean).join(" ");
  return short || user.name || "Usuário sem nome (ainda não logou)";
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

export function formatCode(code) {
  if (!code) return "";
  const mid = Math.ceil(code.length / 2);
  return `${code.slice(0, mid)} ${code.slice(mid)}`;
}

export const ROLE_LABELS = {
  USER: "Usuário",
  ADMIN_LOCAL: "Admin local",
  ADMIN_GLOBAL: "Admin global",
};

export const ACTION_LABELS = {
  LOGIN_SUCCESS: "Login",
  LOGIN_FAILED: "Falha de login",
  OTP_CREATE: "Criou OTP",
  OTP_UPDATE: "Editou OTP",
  OTP_DELETE: "Excluiu OTP",
  OTP_SHARE: "Compartilhou",
  OTP_UNSHARE: "Revogou compartilhamento",
  OTP_TRANSFER: "Transferiu posse",
  OTP_COPY: "Copiou código",
  ADMIN_VIEW_CODE: "Admin revelou código",
  ROLE_CHANGE: "Alterou perfil",
};

export const isAdmin = (user) => user?.role === "ADMIN_LOCAL" || user?.role === "ADMIN_GLOBAL";
