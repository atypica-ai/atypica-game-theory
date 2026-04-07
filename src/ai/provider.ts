import "server-only"; // To prevent accidental usage in Client Components

import { proxiedFetch } from "@/lib/proxy/fetch";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAzure } from "@ai-sdk/azure";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { createVertexAnthropic } from "@ai-sdk/google-vertex/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createPerplexity } from "@ai-sdk/perplexity";
import { createXai } from "@ai-sdk/xai";

const perplexity = createPerplexity({
  apiKey: process.env.PERPLEXITY_API_KEY,
  fetch: proxiedFetch,
});

const openAICompatible = createOpenAICompatible({
  name: "litellm",
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL!,
  includeUsage: true,
  supportsStructuredOutputs: true,
});

// const openAI = createOpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   baseURL: process.env.OPENAI_BASE_URL!,
// });

const siliconflow = createOpenAICompatible({
  name: "siliconflow",
  apiKey: process.env.SILICONFLOW_API_KEY,
  baseURL: process.env.SILICONFLOW_BASE_URL!,
  includeUsage: true,
});

const deepseek = createDeepSeek({
  apiKey: process.env.SILICONFLOW_API_KEY,
  baseURL: process.env.SILICONFLOW_BASE_URL!,
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

const azureEastUS2 = createAzure({
  resourceName: process.env.AZURE_EASTUS2_RESOURCE_NAME,
  apiKey: process.env.AZURE_EASTUS2_API_KEY,
  fetch: proxiedFetch,
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const google = (modelId: string) => {
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
  return googleGenerativeAI(modelId);
};

const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION,
  googleAuthOptions: {
    credentials: JSON.parse(
      Buffer.from(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64!,
        'base64'
      ).toString()
    ),
  },
  fetch: proxiedFetch,
});

const vertexGlobal = createVertex({
  location: "global",
  project: process.env.GOOGLE_VERTEX_PROJECT,
  googleAuthOptions: {
    credentials: JSON.parse(
      Buffer.from(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64!,
        'base64'
      ).toString()
    ),
  },
  fetch: proxiedFetch,
});

const vertexClaude = createVertexAnthropic({
  location: process.env.GOOGLE_VERTEX_CLAUDE_LOCATION,
  project: process.env.GOOGLE_VERTEX_PROJECT,
  googleAuthOptions: {
    credentials: JSON.parse(
      Buffer.from(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64!,
        'base64'
      ).toString()
    ),
  },
  fetch: proxiedFetch,
});

const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
  fetch: proxiedFetch,
});

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

// export const defaultProviderOptions = {
//   // 这个只是给 litellm 的 openai provider 用的，直连模型的情况下不需要
//   // 目前用了 openai-compatible 上的 includeUsage 参数，这里就不需要配置了
//   // openai: {
//   //   stream_options: { include_usage: true },
//   //   // IMPORTANT: litellm 不支持这个 bedrock 的参数输入，但是在 litellm model 配置里设置了，它会发给 bedrock api
//   //   // anthropic_beta: ["token-efficient-tools-2025-02-19"],
//   // },
//   // google: {
//   //   // Options are nested under 'google' for Vertex provider
//   //   thinkingConfig: {
//   //     includeThoughts: false,
//   //     // thinkingBudget: 2048, // Optional
//   //   },
//   // } satisfies GoogleGenerativeAIProviderOptions,
// };

/**
 * 为了彻底避免全局变量污染
 * const providerOptions = defaultProviderOptions
 * or
 * { providerOptions: defaultProviderOptions() }
 * 以后修改 providerOptions
 *
 * 索性使用 function
 *
 * @param llm 根据不同 llm 返回不同默认配置，暂时不使用，但之后可以考虑实现，比如 gpt-5.2 和 claude sonnet 都有一些默认的 reasoning 设置
 */
export const defaultProviderOptions = (
  llm?: LLMModelName, // eslint-disable-line @typescript-eslint/no-unused-vars
) => {
  return {};
};

export type LLMModelName =
  | "gpt-4o"
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano"
  | "gpt-5"
  | "gpt-5-mini"
  | "gpt-5-mini-responses"
  | "gpt-5-nano"
  | "gpt-5.1"
  | "gpt-5.2"
  | "gpt-5.4"
  | "o3-mini"
  // | "claude-3-5-haiku"
  // | "claude-3-7-sonnet"
  | "claude-sonnet-4"
  | "claude-sonnet-4-5"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5"
  | "minimax-m2.1"
  | "kimi-k2-thinking"
  | "kimi-k2.5"
  // | "gemini-2.5-flash"
  // | "gemini-2.5-pro"
  | "gemini-2.5-flash-image"
  | "gemini-3-flash"
  | "gemini-3.1-pro"
  | "gemini-3-pro-image"
  | "grok-4-1-fast-non-reasoning"
  | "grok-4-1-fast-reasoning"
  | "deepseek-v3"
  | "deepseek-r1"
  | "qwen3-235b-a22b"
  | "sonar-pro";

export function llm(modelName: LLMModelName) {
  const openai = openAICompatible;
  const deployRegion = getDeployRegion();
  if (deployRegion === "mainland") {
    switch (modelName) {
      case "gpt-4o":
      case "gpt-5":
      case "gpt-5-mini":
      case "gpt-5-mini-responses":
      case "gpt-5-nano":
      case "gpt-5.1":
      case "gpt-5.2":
      case "gpt-5.4":
        if (process.env.AZURE_EASTUS2_API_KEY) {
          break;
        } else {
          return openai(modelName);
        }
      case "gpt-4.1":
      case "gpt-4.1-mini":
      case "gpt-4.1-nano":
      case "o3-mini":
        if (process.env.AZURE_API_KEY) {
          break;
        } else {
          return openai(modelName);
        }
      // case "claude-3-7-sonnet":
      case "claude-sonnet-4":
      case "claude-sonnet-4-5":
      case "minimax-m2.1":
      case "kimi-k2-thinking":
      case "kimi-k2.5":
        if (process.env.AWS_BEDROCK_ACCESS_KEY_ID) {
          break;
        } else {
          return openai(modelName);
        }
      case "claude-haiku-4-5":
      case "claude-sonnet-4-6":
      // case "gemini-2.5-flash":
      // case "gemini-2.5-pro":
      case "gemini-2.5-flash-image":
      case "gemini-3-flash":
      case "gemini-3.1-pro":
      case "gemini-3-pro-image":
        if (process.env.GOOGLE_VERTEX_PRIVATE_KEY) {
          break;
        } else {
          return openai(modelName);
        }
      case "grok-4-1-fast-non-reasoning":
      case "grok-4-1-fast-reasoning":
        if (process.env.XAI_API_KEY) {
          break;
        } else {
          return openai(modelName);
        }
      case "deepseek-v3":
      case "deepseek-r1":
      // if (process.env.SILICONFLOW_API_KEY) {
      //   break;
      // }
      case "qwen3-235b-a22b":
        return openai(modelName); // options 支持 parallelToolCalls 参数
    }
  }
  switch (modelName) {
    case "gpt-4o":
      return azureEastUS2("gpt-4o"); // gpt-4o 自动支持 prompt cache，gpt-4.1 还不支持
    case "gpt-5":
      return azureEastUS2("gpt-5");
    case "gpt-5-mini":
      return azureEastUS2("gpt-5-mini");
    case "gpt-5-mini-responses":
      return azureEastUS2.responses("gpt-5-mini");
    case "gpt-5-nano":
      return azureEastUS2("gpt-5-nano");
    case "gpt-5.1":
      return azureEastUS2("gpt-5.1");
    case "gpt-5.2":
      return azureEastUS2("gpt-5.2");
    case "gpt-5.4":
      return azureEastUS2("gpt-5.4");
    case "gpt-4.1":
      return azure("gpt-4.1"); // options 支持 parallelToolCalls 参数
    case "gpt-4.1-mini":
      return azure("gpt-4.1-mini");
    case "gpt-4.1-nano":
      return azure("gpt-4.1-nano");
    case "o3-mini":
      return azure("o3-mini");
    // case "claude-3-5-haiku":
    //   return bedrock("us.anthropic.claude-3-5-haiku-20241022-v1:0");
    // case "claude-3-7-sonnet":
    //   return bedrock("us.anthropic.claude-3-7-sonnet-20250219-v1:0");
    // case "claude-3-7-sonnet-beta":
    //   return bedrock("us.anthropic.claude-3-7-sonnet-20250219-v1:0", {
    //     additionalModelRequestFields: {
    //       anthropic_beta: ["token-efficient-tools-2025-02-19"],
    //     },
    //   });
    case "claude-sonnet-4":
      return bedrock("us.anthropic.claude-sonnet-4-20250514-v1:0");
    case "claude-sonnet-4-5":
      return bedrock("global.anthropic.claude-sonnet-4-5-20250929-v1:0");
    case "minimax-m2.1":
      return bedrock("minimax.minimax-m2");
    case "kimi-k2-thinking":
      return bedrock("moonshot.kimi-k2-thinking");
    case "kimi-k2.5":
      return bedrock("moonshotai.kimi-k2.5");
    // case "gemini-2.5-flash":
    //   return google("gemini-2.5-flash-preview-04-17");
    // case "gemini-2.5-pro":
    //   return google("gemini-2.5-pro-preview-03-25");
    case "claude-haiku-4-5":
      return vertexClaude("claude-haiku-4-5");
    case "claude-sonnet-4-6":
      return vertexClaude("claude-sonnet-4-6");
    // case "gemini-2.5-flash":
    //   return vertex("gemini-2.5-flash");
    // case "gemini-2.5-pro":
    //   return vertex("gemini-2.5-pro");
    case "gemini-2.5-flash-image":
      return vertexGlobal("gemini-2.5-flash-image");
    case "gemini-3-flash":
      return vertexGlobal("gemini-3-flash-preview");
    case "gemini-3.1-pro":
      return vertexGlobal("gemini-3.1-pro-preview");
    case "gemini-3-pro-image":
      return vertexGlobal("gemini-3-pro-image-preview");
    case "grok-4-1-fast-non-reasoning":
      return xai.responses("grok-4-1-fast-non-reasoning");
    case "grok-4-1-fast-reasoning":
      return xai.responses("grok-4-1-fast-reasoning");
    case "deepseek-v3":
      return deepseek("Pro/deepseek-ai/DeepSeek-V3");
    case "deepseek-r1":
      return deepseek("Pro/deepseek-ai/DeepSeek-R1");
    case "qwen3-235b-a22b":
      return siliconflow("Qwen/Qwen3-235B-A22B");
    case "sonar-pro":
      return perplexity("sonar-pro");
  }
}

export type ImageModelName = "gpt-image-1" | "imagen-4.0-ultra" | "imagen-4.0";

export function imageModel(modelName: ImageModelName) {
  switch (modelName) {
    case "gpt-image-1":
      return azure.imageModel("gpt-image-1");
    case "imagen-4.0-ultra":
      return vertex.image("imagen-4.0-ultra-generate-001");
    case "imagen-4.0":
      return vertex.image("imagen-4.0-generate-001");
  }
}
