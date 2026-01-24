import "dotenv/config";
import "server-only";

// import { readReplicas } from "@prisma/extension-read-replicas";
// import { withAccelerate } from "@prisma/extension-accelerate";
import { rootLogger } from "@/lib/logging";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { Prisma, PrismaClient } from "./generated/client";

// export const prisma = new PrismaClient();

// 通过打印 process.env 看到的，不一定是稳定的判断方式
const IS_NEXT_BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build";

const log: Prisma.LogLevel[] =
  process.env.LOG_LEVEL?.toLowerCase() === "debug"
    ? ["query", "info", "warn", "error"]
    : ["info", "warn", "error"];

// 从环境变量获取连接池配置
function getPoolConfig() {
  return {
    max: parseInt(process.env.DB_POOL_MAX || "20", 10),
    min: parseInt(process.env.DB_POOL_MIN || "5", 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || "10000", 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || "30000", 10),
    keepAliveInitialDelayMillis: parseInt(
      process.env.DB_KEEP_ALIVE_INITIAL_DELAY_MS || "10000",
      10,
    ),
    maxUses: parseInt(process.env.DB_POOL_MAX_USES || "7500", 10),
  };
}

// 创建连接池配置
function createPool(connectionString?: string, isReadOnly = false) {
  if (IS_NEXT_BUILD_PHASE) {
    return { pool: new Pool(), monitoringInterval: undefined };
  }

  if (!connectionString) {
    throw new Error("Missing connection string");
  }

  const poolConfig = getPoolConfig();

  const pool = new Pool({
    connectionString,
    // 连接池配置（可通过环境变量自定义）
    max: poolConfig.max, // 最大连接数 (DB_POOL_MAX)
    min: poolConfig.min, // 最小连接数 (DB_POOL_MIN)
    connectionTimeoutMillis: poolConfig.connectionTimeoutMillis, // 连接超时 (DB_CONNECTION_TIMEOUT_MS)
    idleTimeoutMillis: poolConfig.idleTimeoutMillis, // 空闲连接超时 (DB_IDLE_TIMEOUT_MS)

    // 启用连接保活，防止长时间空闲连接被数据库关闭
    keepAlive: true,
    keepAliveInitialDelayMillis: poolConfig.keepAliveInitialDelayMillis, // (DB_KEEP_ALIVE_INITIAL_DELAY_MS)

    // 长时间运行的数据库连接可能会遇到内存泄漏、事务未正确回滚、临时表残留等，使用一定次数以后回收
    maxUses: poolConfig.maxUses,

    // 错误处理
    allowExitOnIdle: false,
  });

  // 监听连接池错误，帮助诊断连接问题
  pool.on("error", (err) => {
    rootLogger.error({
      msg: "PostgreSQL pool error",
      error: err.message,
      ro: isReadOnly,
    });
  });

  pool.on("connect", () => {
    rootLogger.debug({
      msg: "PostgreSQL pool connected",
      ro: isReadOnly,
    });
  });

  // ✅ 添加更详细的监控
  pool.on("acquire", () => {
    const stats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    };

    rootLogger.debug({
      msg: "Connection acquired from pool",
      ro: isReadOnly,
      stats,
    });

    // ⚠️ 警告：如果没有空闲连接且有等待队列
    if (stats.idle === 0 && stats.waiting > 0) {
      rootLogger.warn({
        msg: "⚠️ Connection pool exhausted!",
        ro: isReadOnly,
        stats,
        // 这个警告说明你的连接池太小或有连接泄漏
      });
    }
  });

  pool.on("remove", () => {
    rootLogger.debug({
      msg: "Connection removed from pool",
      ro: isReadOnly,
      total: pool.totalCount,
    });
  });

  // ✅ 定期报告连接池状态（可选，用于生产监控）
  let monitoringInterval: NodeJS.Timeout | undefined = undefined;
  if (process.env.NODE_ENV === "production") {
    monitoringInterval = setInterval(() => {
      const stats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      };
      if (stats.waiting > 0 || stats.idle === 0) {
        rootLogger.warn({
          msg: "Connection pool status check",
          ro: isReadOnly,
          stats,
        });
      }
    }, 30000); // 每 30 秒检查一次
  }

  rootLogger[process.env.NODE_ENV === "production" ? "info" : "debug"]({
    msg: `Created PostgreSQL connection pool`,
    ro: isReadOnly,
    config: {
      max: poolConfig.max,
      min: poolConfig.min,
      idleTimeoutMillis: poolConfig.idleTimeoutMillis,
      connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
    },
  });

  return { pool, monitoringInterval };
}

// 使用 Pool 创建 Prisma 客户端
function createPrismaWithPool(pool: Pool, isReadOnly: boolean) {
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log,
  });

  client.$on("error", (e) => {
    rootLogger.error({
      msg: `Prisma${isReadOnly ? " RO" : ""} Error: ${e.message}`,
      target: e.target,
      ro: isReadOnly,
    });
  });

  return client;
}

const globalForPrisma = globalThis as unknown as {
  __prismaInstances__:
    | {
        prisma: PrismaClient;
        prismaRO: PrismaClient;
        pool: Pool;
        poolRO: Pool;
        monitoringIntervals: NodeJS.Timeout[];
      }
    | undefined;
};

// 创建或重用 Pool 和 PrismaClient 实例（单例模式）
if (!globalForPrisma.__prismaInstances__) {
  const { pool, monitoringInterval: mainInterval } = createPool(process.env.DATABASE_URL, false);
  const { pool: poolRO, monitoringInterval: roInterval } = createPool(
    process.env.DATABASE_RO_URL || process.env.DATABASE_URL,
    true,
  );

  const monitoringIntervals: NodeJS.Timeout[] = [];
  if (mainInterval) monitoringIntervals.push(mainInterval);
  if (roInterval) monitoringIntervals.push(roInterval);

  globalForPrisma.__prismaInstances__ = {
    pool,
    poolRO,
    prisma: createPrismaWithPool(pool, false),
    prismaRO: createPrismaWithPool(poolRO, true),
    monitoringIntervals,
  };
}

export const { prisma, prismaRO, pool, poolRO } = globalForPrisma.__prismaInstances__;

// 获取连接池状态（用于健康检查和监控）
export function getPoolStats() {
  return {
    main: {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    },
    readOnly: {
      totalCount: poolRO.totalCount,
      idleCount: poolRO.idleCount,
      waitingCount: poolRO.waitingCount,
    },
  };
}

// 优雅关闭：在生产环境中，确保进程退出时正确断开数据库连接
if (!IS_NEXT_BUILD_PHASE && process.env.NODE_ENV === "production") {
  const gracefulShutdown = async (signal: string) => {
    rootLogger.info({ msg: `Received ${signal}, closing database connections...` });
    try {
      // 清理监控 intervals
      const { monitoringIntervals } = globalForPrisma.__prismaInstances__!;
      monitoringIntervals.forEach((intervalId) => clearInterval(intervalId));

      // 先断开 Prisma 客户端
      await Promise.all([prisma.$disconnect(), prismaRO.$disconnect()]);

      // 再关闭底层连接池
      await Promise.all([pool.end(), poolRO.end()]);

      rootLogger.info({ msg: "Database connections closed" });
      process.exit(0);
    } catch (error) {
      rootLogger.error({
        msg: "Error during graceful shutdown",
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}
