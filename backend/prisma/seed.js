import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

async function main() {
  const cpf = String(process.env.INITIAL_USER_CPF || "").replace(/\D/g, "");
  if (cpf.length !== 11) {
    console.warn("INITIAL_USER_CPF ausente ou inválido; nenhum admin global inicial criado.");
    return;
  }

  // Only bootstraps; once a global admin exists, roles are managed through the app.
  const globals = await prisma.user.count({ where: { role: "ADMIN_GLOBAL" } });
  if (globals > 0) return;

  await prisma.user.upsert({
    where: { cpf },
    update: { role: "ADMIN_GLOBAL" },
    create: { cpf, role: "ADMIN_GLOBAL" },
  });
  console.log(`Admin global inicial garantido: ${cpf}`);
}

main()
  .catch((err) => {
    console.error("Erro no seed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
