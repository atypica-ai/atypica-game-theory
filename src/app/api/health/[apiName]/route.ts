import { prisma } from "@/prisma/prisma";
import { generateText } from "ai";
import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

import { createTextEmbedding } from "@/ai/embedding";
import { llm } from "@/ai/provider";
import {
  dySearchTool,
  insSearchTool,
  tiktokSearchTool,
  twitterSearchTool,
  xhsSearchTool,
} from "@/ai/tools/tools";
import { sendEmail } from "@/email/lib";
import { proxiedFetch } from "@/lib/proxy/fetch";
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
        url: `${origin}/.ping`,
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
  webSearch: {
    type: "ai-service",
    test: async () => {
      if (!process.env.TAVILY_API_KEY) {
        throw new Error("TAVILY_API_KEY not configured");
      }

      // Import webSearch function dynamically
      const { webSearchTool } = await import("@/ai/tools/experts/webSearch");

      // Create a minimal test tool instance
      const testTool = webSearchTool({
        studyUserChatId: 0,
        statReport: async () => {},
      });

      const result = await testTool.execute(
        { query: "test health check" },
        { toolCallId: "health-check", messages: [] }
      );

      return {
        hasResults: Array.isArray(result.results) && result.results.length > 0,
        timestamp: new Date().toISOString(),
      };
    },
  },
  database: {
    type: "database-service",
    test: async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return {
          message: "Database connection successful",
          timestamp: new Date().toISOString(),
        };
      } finally {
        await prisma.$disconnect();
      }
    },
  },
  claude: {
    type: "llm-service",
    test: async () => {
      const { text } = await generateText({
        model: llm("claude-sonnet-4"),
        prompt: "hello",
      });
      return {
        response: text,
        model: "claude-sonnet-4",
        timestamp: new Date().toISOString(),
      };
    },
  },
  gpt: {
    type: "llm-service",
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
    type: "llm-service",
    test: async () => {
      const { text } = await generateText({
        model: llm("gemini-2.5-flash"),
        prompt: "hello",
      });
      return {
        response: text,
        model: "gemini-2.5-flash",
        timestamp: new Date().toISOString(),
      };
    },
  },
  whisper: {
    type: "transcription-service",
    test: async () => {
      // Create a minimal audio file for testing (silence)
      const minimalWavBuffer = Buffer.from([
        0x52,
        0x49,
        0x46,
        0x46, // "RIFF"
        0x24,
        0x08,
        0x00,
        0x00, // file size
        0x57,
        0x41,
        0x56,
        0x45, // "WAVE"
        0x66,
        0x6d,
        0x74,
        0x20, // "fmt "
        0x10,
        0x00,
        0x00,
        0x00, // fmt chunk size
        0x01,
        0x00, // audio format (PCM)
        0x01,
        0x00, // number of channels
        0x40,
        0x1f,
        0x00,
        0x00, // sample rate (8000 Hz)
        0x80,
        0x3e,
        0x00,
        0x00, // byte rate
        0x02,
        0x00, // block align
        0x10,
        0x00, // bits per sample
        0x64,
        0x61,
        0x74,
        0x61, // "data"
        0x00,
        0x08,
        0x00,
        0x00, // data size
        // 2048 bytes of silence (zeros)
        ...new Array(2048).fill(0),
      ]);

      const audioFile = new File([minimalWavBuffer], "test.wav", {
        type: "audio/wav",
      });

      if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY not configured");
      }

      const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fetch: async (url: any, init?: any) =>
          await proxiedFetch(url, {
            ...init,
            duplex: "half",
          }),
      });

      const result = await groq.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-large-v3",
        response_format: "json",
        language: "en",
      });

      return {
        transcription: result.text || "(silence)",
        model: "whisper-large-v3",
        timestamp: new Date().toISOString(),
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
  } else if (
    config.type === "email-service" ||
    config.type === "ai-service" ||
    config.type === "database-service" ||
    config.type === "llm-service" ||
    config.type === "transcription-service"
  ) {
    const serviceConfig = config as {
      type:
        | "email-service"
        | "ai-service"
        | "database-service"
        | "llm-service"
        | "transcription-service";
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

    // Special handling for "ping" - just return a simple healthy response
    if (apiName === "ping") {
      testResult = {
        healthy: true,
        result: {
          message: "pong",
          timestamp: new Date().toISOString(),
        },
      };
    }
    // Check if it's a social tool
    else if (apiName in SOCIAL_TOOLS) {
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
