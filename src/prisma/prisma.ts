import "dotenv/config";
import "server-only";

// import { readReplicas } from "@prisma/extension-read-replicas";
// import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "./generated/client";

// export const prisma = new PrismaClient();

const log: Prisma.LogLevel[] =
  process.env.LOG_LEVEL?.toLowerCase() === "debug"
    ? ["query", "info", "warn", "error"]
    : ["info", "warn", "error"];

function newPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({
    adapter,
    log,
  });
  // return new PrismaClient({ log }).$extends(withAccelerate());
  // const databaseUrl = process.env.DATABASE_URL
  //   ? process.env.DATABASE_URL
  //   : "postgres://user:password@localhost:5432/dbname"; // 仅用于 pnpm build 环境，类型不报错
  // return process.env.DATABASE_RO_URL
  //   ? new PrismaClient({ log }).$extends(readReplicas({ url: process.env.DATABASE_RO_URL }))
  //   : new PrismaClient({ log }).$extends(readReplicas({ url: databaseUrl }));
}

function newPrismaROClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_RO_URL || process.env.DATABASE_URL,
  });
  return new PrismaClient({
    adapter,
    log,
  });
}

const globalForPrisma = global as unknown as {
  prisma: ReturnType<typeof newPrismaClient> | undefined;
  prismaRO: ReturnType<typeof newPrismaROClient> | undefined;
};

// 创建 PrismaClient 实例或使用已有实例
export const prisma = globalForPrisma.prisma || newPrismaClient();
export const prismaRO = globalForPrisma.prismaRO || newPrismaROClient();

// 在所有环境中都保存到全局对象，只是开发环境会频繁热重载
globalForPrisma.prisma = prisma;
globalForPrisma.prismaRO = prismaRO;
