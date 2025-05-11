import { PrismaClient } from "./client";

// export const prisma = new PrismaClient();

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// 创建 PrismaClient 实例或使用已有实例
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.LOG_LEVEL?.toLowerCase() === "debug"
        ? ["query", "info", "warn", "error"]
        : ["info", "warn", "error"],
  });

// 在所有环境中都保存到全局对象，只是开发环境会频繁热重载
globalForPrisma.prisma = prisma;
