import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { config } from "../config.js";

export const prisma = new PrismaClient({ adapter: new PrismaMariaDb(config.databaseUrl) });
