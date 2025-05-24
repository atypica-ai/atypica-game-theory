import "server-only"; // To prevent accidental usage in Client Components

import { proxiedFetch } from "@/lib/proxy/fetch";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAzure } from "@ai-sdk/azure";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
  compatibility: "strict", // so stream_options will be sent
});

const siliconflow = createOpenAI({
  apiKey: process.env.SILICONFLOW_API_KEY,
  baseURL: process.env.SILICONFLOW_BASE_URL,
});

const deepseek = createDeepSeek({
  apiKey: process.env.SILICONFLOW_API_KEY,
  baseURL: process.env.SILICONFLOW_BASE_URL,
});

const bedrock = createAmazonBedrock({
  region: process.env.AWS_BEDROCK_REGION,
  accessKeyId: process.env.AWS_BEDROCK_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY,
  fetch: proxiedFetch,
});

const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME,
  apiKey: process.env.AZURE_API_KEY,
  fetch: proxiedFetch,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
const google = (modelId: string, settings?: any) => {
  const apiKeys: string[] = (process.env.GOOGLE_GENERATIVE_AI_API_KEYS ?? "")
    .split(/\s+/)
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
  if (apiKeys.length === 0) {
    throw new Error("Google Generative AI API keys are not configured");
  }
  const googleGenerativeAI = createGoogleGenerativeAI({
    apiKey: apiKeys[Math.floor(Math.random() * apiKeys.length)],
    fetch: proxiedFetch,
  });
  return googleGenerativeAI(modelId, settings);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vertex = (modelId: string, settings?: any) => {
  const credentials = JSON.parse(process.env.GOOGLE_VERTEX_AI_APPLICATION_CREDENTIALS!);
  const _vertex = createVertex({
    location: process.env.GOOGLE_VERTEX_LOCATION,
    project: process.env.GOOGLE_VERTEX_PROJECT,
    googleAuthOptions: {
      credentials: credentials,
    },
    fetch: proxiedFetch,
  });
  return _vertex(modelId, settings);
};

// export const bedrock = (model: "claude-3-7-sonnet" = "claude-3-7-sonnet") => {
//   if (model === "claude-3-7-sonnet") {
//     return _bedrock("us.anthropic.claude-3-7-sonnet-20250219-v1:0", {
//       additionalModelRequestFields: {
//         // https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#disabling-parallel-tool-use
//         // https://docs.anthropic.com/en/docs/build-with-claude/tool-use/token-efficient-tool-use
//         // https://community.aws/content/2trguomubYb8f3JNzCeBgNvassc/claude-token-efficient-tool-use-on-amazon-bedrock
//         // bedrock 和 anthropic 的接口格式不同
//         anthropic_beta: ["token-efficient-tools-2025-02-19"],
//       },
//     });
//   } else {
//     return _bedrock(model);
//   }
// };

export const providerOptions = {
  openai: {
    stream_options: { include_usage: true },
    // IMPORTANT: litellm 不支持这个 bedrock 的参数输入，但是在 litellm model 配置里设置了，它会发给 bedrock api
    // anthropic_beta: ["token-efficient-tools-2025-02-19"],
  },
};

export type LLMModelName =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "o3-mini"
  | "claude-3-7-sonnet"
  | "claude-4-sonnet"
  | "gemini-2.5-flash"
  | "gemini-2.5-pro"
  | "deepseek-v3"
  | "deepseek-r1"
  | "qwen3-235b-a22b";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function llm(modelName: LLMModelName, options?: any) {
  const deployRegion = getDeployRegion();
  if (deployRegion === "mainland") {
    switch (modelName) {
      case "deepseek-v3":
      case "deepseek-r1":
      case "o3-mini":
      case "gpt-4o":
      case "gpt-4o-mini":
        return openai(modelName, options); // options 支持 parallelToolCalls 参数
    }
  }
  switch (modelName) {
    case "gpt-4o":
      return azure("gpt-4o", options); // options 支持 parallelToolCalls 参数
    case "gpt-4o-mini":
      return azure("gpt-4o-mini", options); // options 支持 parallelToolCalls 参数
    case "o3-mini":
      return azure("o3-mini", options);
    case "claude-3-7-sonnet":
      return bedrock("us.anthropic.claude-3-7-sonnet-20250219-v1:0", options);
    // case "claude-3-7-sonnet-beta":
    //   return bedrock("us.anthropic.claude-3-7-sonnet-20250219-v1:0", {
    //     additionalModelRequestFields: {
    //       anthropic_beta: ["token-efficient-tools-2025-02-19"],
    //     },
    //   });
    case "claude-4-sonnet":
      return bedrock("us.anthropic.claude-sonnet-4-20250514-v1:0", options);
    // case "gemini-2.5-flash":
    //   return google("gemini-2.5-flash-preview-04-17", options);
    // case "gemini-2.5-pro":
    //   return google("gemini-2.5-pro-preview-03-25", options);
    case "gemini-2.5-flash":
      return vertex("gemini-2.5-flash-preview-05-20", options);
    case "gemini-2.5-pro":
      return vertex("gemini-2.5-pro-preview-05-06", options);
    case "deepseek-v3":
      return deepseek("Pro/deepseek-ai/DeepSeek-V3", options);
    case "deepseek-r1":
      return deepseek("Pro/deepseek-ai/DeepSeek-R1", options);
    case "qwen3-235b-a22b":
      return siliconflow("Qwen/Qwen3-235B-A22B", options);
  }
}
