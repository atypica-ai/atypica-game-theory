import { getPoolStats, prisma, prismaRO } from "@/prisma/prisma";
import { llm } from "@/ai/provider";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

const API_CONFIGS = {
  database: {
    test: async () => {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const mainLatency = Date.now() - startTime;

      const roStartTime = Date.now();
      await prismaRO.$queryRaw`SELECT 1`;
      const roLatency = Date.now() - roStartTime;

      const poolStats = getPoolStats();

      return {
        message: "Database connection successful",
        latency: {
          main: `${mainLatency}ms`,
          readOnly: `${roLatency}ms`,
        },
        pool: {
          main: {
            total: poolStats.main.totalCount,
            idle: poolStats.main.idleCount,
            waiting: poolStats.main.waitingCount,
            active: poolStats.main.totalCount - poolStats.main.idleCount,
          },
          readOnly: {
            total: poolStats.readOnly.totalCount,
            idle: poolStats.readOnly.idleCount,
            waiting: poolStats.readOnly.waitingCount,
            active: poolStats.readOnly.totalCount - poolStats.readOnly.idleCount,
          },
        },
        timestamp: new Date().toISOString(),
      };
    },
  },
  claude: {
    test: async () => {
      const { text } = await generateText({
        model: llm("claude-sonnet-4-5"),
        prompt: "hello",
      });
      return {
        response: text,
        model: "claude-sonnet-4-5",
        timestamp: new Date().toISOString(),
      };
    },
  },
  gpt: {
    test: async () => {
      const { text } = await generateText({
        model: llm("gpt-4o"),
        prompt: "hello",
      });
      return {
        response: text,
        model: "gpt-4o",
        timestamp: new Date().toISOString(),
      };
    },
  },
  gemini: {
    test: async () => {
      const { text } = await generateText({
        model: llm("gemini-3-flash"),
        prompt: "hello",
      });
      return {
        response: text,
        model: "gemini-3-flash",
        timestamp: new Date().toISOString(),
      };
    },
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ apiName: string }> },
) {
  const { apiName } = await params;

  try {
    if (apiName === "ping") {
      return NextResponse.json(
        { api: "ping", status: "healthy", result: { message: "pong", timestamp: new Date().toISOString() } },
        { status: 200 },
      );
    }

    const config = API_CONFIGS[apiName as keyof typeof API_CONFIGS];
    if (!config) {
      return NextResponse.json({ error: "API not found" }, { status: 404 });
    }

    const result = await config.test();
    return NextResponse.json({ api: apiName, status: "healthy", result }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        api: apiName,
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
