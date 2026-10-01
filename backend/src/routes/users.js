import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { HttpError, maskCpf, onlyDigits, publicUserSelect } from "../lib/http.js";

const router = Router();

export function buildUserSearchWhere(q) {
  const term = String(q || "").trim();
  if (term.length < 3) throw new HttpError(400, "Digite ao menos 3 caracteres");
  const digits = onlyDigits(term);
  const or = [{ name: { contains: term } }, { warName: { contains: term } }];
  if (digits.length >= 3) {
    or.push({ cpf: { startsWith: digits } }, { saram: { startsWith: digits } });
  }
  return { OR: or };
}

router.get("/search", async (req, res) => {
  const users = await prisma.user.findMany({
    where: { AND: [buildUserSearchWhere(req.query.q), { id: { not: req.user.id } }] },
    select: { ...publicUserSelect, cpf: true },
    orderBy: [{ warName: "asc" }, { name: "asc" }],
    take: 20,
  });
  res.json(users.map(({ cpf, ...u }) => ({ ...u, cpfMasked: maskCpf(cpf) })));
});

export default router;
