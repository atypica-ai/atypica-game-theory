import { resetUserMonthlyTokens } from "@/app/payment/monthlyTokens";
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
    const usersToReset = await prisma.tokensAccount.findMany({
      where: {
        AND: [
          { userId: { not: null } },
          { OR: [{ monthlyResetAt: null }, { monthlyResetAt: { lte: now } }] },
          { user: { subscriptions: { some: {} } } }, // 有任何subscription记录
        ],
      },
      select: {
        userId: true,
        monthlyResetAt: true,
      },
    });
    logger.info(`Found ${usersToReset.length} users to reset monthly tokens`);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ userId: number; error: string }> = [];

    // 遍历每个用户，调用 resetUserMonthlyTokens
    for (const tokensAccount of usersToReset) {
      const userId = tokensAccount.userId!; // userId 不会为空，上面过滤了
      try {
        await resetUserMonthlyTokens({ userId });
        successCount++;
        logger.debug(`Successfully reset monthly tokens for user ${userId}`);
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push({
          userId,
          error: errorMessage,
        });
        logger.error(`Failed to reset monthly tokens for user ${userId}: ${errorMessage}`);
      }
    }

    const result = {
      totalUsers: usersToReset.length,
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
