export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function parsePage(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize, 10) || 50));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export const publicUserSelect = {
  id: true,
  name: true,
  warName: true,
  rank: true,
  saram: true,
  om: true,
};

export function maskCpf(cpf) {
  const d = onlyDigits(cpf);
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : null;
}
