import "server-only";

// import { readReplicas } from "@prisma/extension-read-replicas";
import { Prisma, PrismaClient } from "./client";

// export const prisma = new PrismaClient();

const log: Prisma.LogLevel[] =
  process.env.LOG_LEVEL?.toLowerCase() === "debug"
    ? ["query", "info", "warn", "error"]
    : ["info", "warn", "error"];

function newPrismaClient() {
  return new PrismaClient({ log });
  // const databaseUrl = process.env.DATABASE_URL
  //   ? process.env.DATABASE_URL
  //   : "postgres://user:password@localhost:5432/dbname"; // 仅用于 pnpm build 环境，类型不报错
  // return process.env.DATABASE_RO_URL
  //   ? new PrismaClient({ log }).$extends(readReplicas({ url: process.env.DATABASE_RO_URL }))
  //   : new PrismaClient({ log }).$extends(readReplicas({ url: databaseUrl }));
}

const globalForPrisma = global as unknown as {
  prisma: ReturnType<typeof newPrismaClient> | undefined;
};

// 创建 PrismaClient 实例或使用已有实例
export const prisma = globalForPrisma.prisma || newPrismaClient();

// 在所有环境中都保存到全局对象，只是开发环境会频繁热重载
globalForPrisma.prisma = prisma;
