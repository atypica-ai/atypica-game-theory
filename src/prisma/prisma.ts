import "server-only";
import "./dbtype"; // 这里需要引入一下

// import { readReplicas } from "@prisma/extension-read-replicas";
// import { withAccelerate } from "@prisma/extension-accelerate";
import { rootLogger } from "@/lib/logging";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { Prisma, PrismaClient } from "./generated/client";

// export const prisma = new PrismaClient();

// 通过打印 process.env 看到的，不一定是稳定的判断方式
const IS_NEXT_BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build";
const prismaLogger = rootLogger.child({ module: "prisma" });

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
    prismaLogger.error({
      msg: "PostgreSQL pool error",
      error: err.message,
      ro: isReadOnly,
    });
  });

  pool.on("connect", async (client) => {
    try {
      // 🔒 事务空闲超时：防止事务开启后长时间无操作导致的连接泄漏
      // 30秒足够应对高并发时的 event loop 延迟，同时避免误杀正常事务
      await client.query("SET idle_in_transaction_session_timeout = '30s'");

      // 🔒 查询超时：防止慢查询长时间占用连接
      // 60秒足够处理向量相似度搜索、复杂聚合等合理的慢查询
      await client.query("SET statement_timeout = '60s'");

      prismaLogger.info({
        msg: "PostgreSQL connection initialized with safety timeouts",
        ro: isReadOnly,
      });
    } catch (err) {
      prismaLogger.error({
        msg: "Failed to set connection parameters",
        error: err instanceof Error ? err.message : String(err),
        ro: isReadOnly,
      });
    }
  });

  // ✅ 添加更详细的监控
  pool.on("acquire", () => {
    const stats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    };

    // 使用 debug 级别避免高频日志影响性能（每次数据库操作都会触发）
    prismaLogger.debug({
      msg: "Connection acquired from pool",
      ro: isReadOnly,
      stats,
    });

    // ⚠️ 警告：连接池耗尽（优化条件避免启动时误报）
    // 1. 跳过初始化期间（total < min 说明还在创建最小连接数）
    // 2. 等待队列需要足够长（waiting > 2，避免瞬时单个请求误报）
    const isInitializing = stats.total < poolConfig.min;
    const hasSignificantWaiting = stats.waiting > 2;

    if (!isInitializing && stats.idle === 0 && hasSignificantWaiting) {
      prismaLogger.warn({
        msg: "⚠️ Connection pool exhausted!",
        ro: isReadOnly,
        stats,
        // 这个警告说明你的连接池太小或有连接泄漏
      });
    }
  });

  pool.on("remove", () => {
    // 使用 debug 级别避免高频日志影响性能
    prismaLogger.debug({
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
      // 只在真正有问题时警告：等待队列较长，或同时没有空闲且有等待
      const hasIssue = stats.waiting > 2 || (stats.idle === 0 && stats.waiting > 0);

      if (hasIssue) {
        prismaLogger.warn({
          msg: "Connection pool status check",
          ro: isReadOnly,
          stats,
        });
      }
    }, 30000); // 每 30 秒检查一次
  }

  prismaLogger[process.env.NODE_ENV === "production" ? "info" : "debug"]({
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
    prismaLogger.error({
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
    prismaLogger.info({ msg: `Received ${signal}, closing database connections...` });
    try {
      // 清理监控 intervals
      const { monitoringIntervals } = globalForPrisma.__prismaInstances__!;
      monitoringIntervals.forEach((intervalId) => clearInterval(intervalId));

      // 先断开 Prisma 客户端
      await Promise.all([prisma.$disconnect(), prismaRO.$disconnect()]);

      // 再关闭底层连接池
      await Promise.all([pool.end(), poolRO.end()]);

      prismaLogger.info({ msg: "Database connections closed" });
      process.exit(0);
    } catch (error) {
      prismaLogger.error({
        msg: "Error during graceful shutdown",
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}
