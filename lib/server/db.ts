// Single Prisma client for the whole server. In dev, Next.js hot-reload
// re-runs modules — the globalThis stash stops us opening a new database
// connection on every reload.
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
