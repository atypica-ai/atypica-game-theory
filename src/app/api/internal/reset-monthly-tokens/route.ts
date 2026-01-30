import { resetTeamMonthlyTokens, resetUserMonthlyTokens } from "@/app/payment/monthlyTokens";
import { trackUserServerSideSync } from "@/lib/analytics/server";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

// 只允许集群内部访问的内部API
export async function POST(request: NextRequest) {
  const logger = rootLogger.child({ api: "resetUserMonthlyTokens" });
  try {
    // 验证请求来源 - 只允许集群内部访问
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");
    // 记录请求信息用于调试
    logger.info(
      `Internal reset-monthly-tokens API called - forwardedFor: ${forwardedFor}, realIp: ${realIp}, userAgent: ${userAgent}`,
    );
    // 简单的内部访问验证 - 检查User-Agent或其他内部标识
    // 也可以添加一个内部API密钥验证
    const internalSecret = request.headers.get("x-internal-secret");
    if (internalSecret !== process.env.INTERNAL_API_SECRET) {
      logger.warn(
        `Unauthorized access to internal API - forwardedFor: ${forwardedFor}, realIp: ${realIp}, userAgent: ${userAgent}`,
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    // 查找所有需要重置月度tokens的用户
    // 根据 resetUserMonthlyTokens 函数逻辑：如果 monthlyResetAt === null 或者 monthlyResetAt <= now
    // 过滤条件：只处理有subscription记录的用户，减少处理量
    const accountsToReset = await prisma.tokensAccount.findMany({
      where: {
        AND: [
          {
            OR: [{ monthlyResetAt: null }, { monthlyResetAt: { lte: now } }],
          },
          {
            OR: [
              { user: { subscriptions: { some: {} } } },
              { team: { subscriptions: { some: {} } } },
            ],
          }, // 有任何subscription记录
        ],
      },
      select: {
        userId: true,
        teamId: true,
        monthlyResetAt: true,
      },
    });

    const usersCount = accountsToReset.filter((account) => account.userId !== null).length;
    const teamsCount = accountsToReset.filter((account) => account.teamId !== null).length;

    logger.info(`Found ${usersCount} users and ${teamsCount} teams to reset monthly tokens`);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ userId: number | null; teamId: number | null; error: string }> = [];

    // 批量并发处理，避免串行导致超时
    // 并发数限制为 10，在速度和连接池压力间取得平衡
    // 假设 200 个用户，每个 2 秒：串行需要 400 秒（超时），并发只需 40 秒
    const BATCH_SIZE = 10;

    for (let i = 0; i < accountsToReset.length; i += BATCH_SIZE) {
      const batch = accountsToReset.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(accountsToReset.length / BATCH_SIZE);

      logger.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} accounts)`);

      const batchResults = await Promise.allSettled(
        batch.map(async (tokensAccount) => {
          const { userId, teamId } = tokensAccount;
          if (teamId) {
            await resetTeamMonthlyTokens({ teamId });
          } else if (userId) {
            await resetUserMonthlyTokens({ userId });
            // track user (同步版本，避免 after() 累积)
            await trackUserServerSideSync({ userId, traitTypes: ["revenue"] });
          }
          return { userId, teamId };
        }),
      );

      // 处理批次结果
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const { userId, teamId } = batch[j];

        if (result.status === "fulfilled") {
          successCount++;
          logger.debug(`Successfully reset monthly tokens, user=${userId} team=${teamId}`);
        } else {
          errorCount++;
          const errorMessage =
            result.reason instanceof Error ? result.reason.message : "Unknown error";
          errors.push({
            userId,
            teamId,
            error: errorMessage,
          });
          logger.error(
            `Failed to reset monthly tokens for user=${userId} team=${teamId}: ${errorMessage}`,
          );
        }
      }

      // 批次间短暂延迟，避免瞬时压力（可选）
      if (i + BATCH_SIZE < accountsToReset.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const result = {
      totalUsers: usersCount,
      totalTeams: teamsCount,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString(),
    };
    logger.info(`Monthly tokens reset completed: ${JSON.stringify(result)}`);
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Failed to process monthly tokens reset: ${errorMessage}`);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// 只允许 POST 方法
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
