import { NextRequest, NextResponse } from "next/server";

import { createTextEmbedding } from "@/ai/embedding";
import {
  dySearchTool,
  insSearchTool,
  tiktokSearchTool,
  twitterSearchTool,
  xhsSearchTool,
} from "@/ai/tools/tools";
import { sendEmail } from "@/email/lib";
import { getRequestOrigin } from "@/lib/request/headers";

// Social tools configuration
const SOCIAL_TOOLS = {
  xhsSearch: { tool: xhsSearchTool, params: { keyword: "test" } },
  dySearch: { tool: dySearchTool, params: { keyword: "test" } },
  insSearch: { tool: insSearchTool, params: { keyword: "test" } },
  tiktokSearch: { tool: tiktokSearchTool, params: { keyword: "test" } },
  twitterSearch: { tool: twitterSearchTool, params: { keyword: "test" } },
};

// API configurations
const API_CONFIGS = {
  htmlToPdf: {
    type: "browser-api",
    endpoint: "/html-to-pdf",
    method: "POST",
    getPayload: async () => {
      const origin = await getRequestOrigin();
      return {
        url: origin,
        filename: "health-check",
      };
    },
  },
  sendEmail: {
    type: "email-service",
    test: async () => {
      await sendEmail({
        to: "hi@atypica.ai",
        subject: "[atypica.AI health check]",
        text: "",
        html: "",
      });
      return { message: "Email sent successfully" };
    },
  },
  embedding: {
    type: "ai-service",
    test: async () => {
      const embedding = await createTextEmbedding("test", "retrieval.query");
      return {
        dimension: embedding.length,
        sample: embedding.slice(0, 3),
      };
    },
  },
};

function isSocialToolHealthy(result: unknown): boolean {
  const typedResult = result as { notes?: unknown[]; posts?: unknown[]; comments?: unknown[] };
  const arrays = [typedResult.notes, typedResult.posts, typedResult.comments];
  for (const arr of arrays) {
    if (Array.isArray(arr) && arr.length > 0) {
      return true;
    }
  }
  return false;
}

async function testSocialTool(apiName: string) {
  const toolConfig = SOCIAL_TOOLS[apiName as keyof typeof SOCIAL_TOOLS];
  if (!toolConfig) {
    throw new Error("Social tool not found");
  }

  const result = await toolConfig.tool.execute(toolConfig.params, { toolCallId: "", messages: [] });

  const healthy = isSocialToolHealthy(result);
  return { healthy, result };
}

async function testService(apiName: string) {
  const config = API_CONFIGS[apiName as keyof typeof API_CONFIGS];
  if (!config) {
    throw new Error("Service not found");
  }

  if (config.type === "browser-api") {
    const apiBase = process.env.BROWSER_API_BASE_URL;
    if (!apiBase) {
      throw new Error("BROWSER_API_BASE_URL environment variable is not set");
    }

    const browserConfig = config as {
      type: "browser-api";
      endpoint: string;
      method: string;
      getPayload: () => Promise<{ url: string; filename: string }>;
    };

    const payload = await browserConfig.getPayload();

    const response = await fetch(`${apiBase}${browserConfig.endpoint}`, {
      method: browserConfig.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const healthy = response.ok;
    const result = {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      size: response.headers.get("content-length"),
      url: payload.url,
    };

    return { healthy, result };
  } else if (config.type === "email-service" || config.type === "ai-service") {
    const serviceConfig = config as {
      type: "email-service" | "ai-service";
      test: () => Promise<unknown>;
    };
    const result = await serviceConfig.test();
    return { healthy: true, result };
  }

  throw new Error("Unknown service type");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ apiName: string }> },
) {
  const { apiName } = await params;

  try {
    let testResult;

    // Check if it's a social tool
    if (apiName in SOCIAL_TOOLS) {
      testResult = await testSocialTool(apiName);
    }
    // Check if it's a service API
    else if (apiName in API_CONFIGS) {
      testResult = await testService(apiName);
    } else {
      return NextResponse.json({ error: "API not found" }, { status: 404 });
    }

    const { healthy, result } = testResult;

    return NextResponse.json(
      {
        api: apiName,
        status: healthy ? "healthy" : "unhealthy",
        result,
      },
      { status: healthy ? 200 : 500 },
    );
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
