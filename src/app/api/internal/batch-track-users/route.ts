import { trackUserServerSide } from "@/lib/analytics/server";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

type UserTraitType = "profile" | "stats" | "revenue";

// 只允许集群内部访问的内部API
export async function POST(request: NextRequest) {
  const logger = rootLogger.child({ api: "batchTrackUsers" });
  try {
    // 验证请求来源 - 只允许集群内部访问
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    // 记录请求信息用于调试
    logger.info({
      msg: `Internal batch-track-users API called`,
      forwardedFor,
      realIp,
      userAgent,
    });

    // 内部访问验证
    const internalSecret = request.headers.get("x-internal-secret");
    if (internalSecret !== process.env.INTERNAL_API_SECRET) {
      logger.warn({
        msg: `Unauthorized access to internal API`,
        forwardedFor,
        realIp,
        userAgent,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 解析请求参数
    let days = 1; // 默认 1 天
    let traitTypes: UserTraitType[] = ["profile", "stats", "revenue"]; // 默认追踪这三种

    try {
      const body = await request.json().catch(() => ({}));

      // 验证 days 参数
      if (body.days !== undefined) {
        if (typeof body.days !== "number" || body.days < 1 || body.days > 365) {
          return NextResponse.json(
            { error: "Invalid days parameter. Must be a number between 1 and 365." },
            { status: 400 },
          );
        }
        days = body.days;
      }

      // 验证 traitTypes 参数
      if (body.traitTypes !== undefined) {
        if (!Array.isArray(body.traitTypes)) {
          return NextResponse.json(
            { error: "Invalid traitTypes parameter. Must be an array." },
            { status: 400 },
          );
        }

        // 检查是否包含不允许的类型
        if (body.traitTypes.includes("clientInfo") || body.traitTypes.includes("all")) {
          return NextResponse.json(
            {
              error:
                "Invalid traitTypes. 'clientInfo' and 'all' are not allowed in batch track tasks.",
            },
            { status: 400 },
          );
        }

        // 验证每个类型是否合法
        const validTypes: UserTraitType[] = ["profile", "stats", "revenue"];
        for (const type of body.traitTypes) {
          if (!validTypes.includes(type)) {
            return NextResponse.json(
              {
                error: `Invalid traitType: ${type}. Allowed types: profile, stats, revenue.`,
              },
              { status: 400 },
            );
          }
        }

        traitTypes = body.traitTypes;
      }
    } catch (error) {
      logger.error({
        msg: `Failed to parse request body`,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 查找指定时间范围内注册的用户
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    logger.info({
      msg: `Found users to track`,
      count: users.length,
      days,
      traitTypes,
      startDate: startDate.toISOString(),
    });

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ userId: number; error: string }> = [];

    // 遍历每个用户，调用 trackUserServerSide
    for (const user of users) {
      try {
        await trackUserServerSide({ userId: user.id, traitTypes });
        successCount++;
        logger.debug({ msg: `Successfully tracked user`, userId: user.id });

        // 等待 300ms
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push({
          userId: user.id,
          error: errorMessage,
        });
        logger.error({
          msg: `Failed to track user`,
          userId: user.id,
          error: errorMessage,
        });

        // 即使出错也等待 300ms
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    const result = {
      totalUsers: users.length,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
      parameters: {
        days,
        traitTypes,
        startDate: startDate.toISOString(),
      },
      timestamp: now.toISOString(),
    };

    logger.info({ msg: `Batch track users completed`, result });
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ msg: `Failed to process batch track users`, error: errorMessage });
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
