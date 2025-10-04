import "server-only"; // To prevent accidental usage in Client Components

import { proxiedFetch } from "@/lib/proxy/fetch";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAzure } from "@ai-sdk/azure";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { LanguageModel } from "ai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
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
  location: process.env.GOOGLE_VERTEX_LOCATION,
  project: process.env.GOOGLE_VERTEX_PROJECT,
  googleAuthOptions: {
    credentials: {
      client_email: process.env.GOOGLE_VERTEX_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_VERTEX_PRIVATE_KEY,
    },
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

export const defaultProviderOptions = {
  // 这个只是给 litellm 的 openai provider 用的，直连模型的情况下不需要
  openai: {
    stream_options: { include_usage: true },
    // IMPORTANT: litellm 不支持这个 bedrock 的参数输入，但是在 litellm model 配置里设置了，它会发给 bedrock api
    // anthropic_beta: ["token-efficient-tools-2025-02-19"],
  },
  // google: {
  //   // Options are nested under 'google' for Vertex provider
  //   thinkingConfig: {
  //     includeThoughts: false,
  //     // thinkingBudget: 2048, // Optional
  //   },
  // } satisfies GoogleGenerativeAIProviderOptions,
};

export type LLMModelName =
  | "gpt-4o"
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano"
  | "gpt-5"
  | "gpt-5-mini"
  | "gpt-5-nano"
  | "o3-mini"
  | "claude-3-5-haiku"
  | "claude-3-7-sonnet"
  | "claude-sonnet-4"
  | "gemini-2.5-flash"
  | "gemini-2.5-pro"
  | "grok-4"
  | "grok-3"
  | "grok-3-mini"
  | "deepseek-v3"
  | "deepseek-r1"
  | "qwen3-235b-a22b";

export function llm(modelName: LLMModelName) {
  const deployRegion = getDeployRegion();
  if (deployRegion === "mainland") {
    switch (modelName) {
      case "gpt-4o":
      case "gpt-5":
      case "gpt-5-mini":
      case "gpt-5-nano":
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
      case "claude-3-7-sonnet":
      case "claude-sonnet-4":
        if (process.env.AWS_BEDROCK_ACCESS_KEY_ID) {
          break;
        } else {
          return openai(modelName);
        }
      case "gemini-2.5-flash":
      case "gemini-2.5-pro":
        if (process.env.GOOGLE_VERTEX_PRIVATE_KEY) {
          break;
        } else {
          return openai(modelName);
        }
      case "grok-4":
      case "grok-3":
      case "grok-3-mini":
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
    case "gpt-5-nano":
      return azureEastUS2("gpt-5-nano");
    case "gpt-4.1":
      return azure("gpt-4.1"); // options 支持 parallelToolCalls 参数
    case "gpt-4.1-mini":
      return azure("gpt-4.1-mini");
    case "gpt-4.1-nano":
      return azure("gpt-4.1-nano");
    case "o3-mini":
      return azure("o3-mini");
    case "claude-3-5-haiku":
      return bedrock("us.anthropic.claude-3-5-haiku-20241022-v1:0");
    case "claude-3-7-sonnet":
      return bedrock("us.anthropic.claude-3-7-sonnet-20250219-v1:0");
    // case "claude-3-7-sonnet-beta":
    //   return bedrock("us.anthropic.claude-3-7-sonnet-20250219-v1:0", {
    //     additionalModelRequestFields: {
    //       anthropic_beta: ["token-efficient-tools-2025-02-19"],
    //     },
    //   });
    case "claude-sonnet-4":
      return bedrock("us.anthropic.claude-sonnet-4-20250514-v1:0");
    // case "gemini-2.5-flash":
    //   return google("gemini-2.5-flash-preview-04-17");
    // case "gemini-2.5-pro":
    //   return google("gemini-2.5-pro-preview-03-25");
    case "gemini-2.5-flash":
      return vertex("gemini-2.5-flash");
    case "gemini-2.5-pro":
      return vertex("gemini-2.5-pro");
    case "grok-4":
      return xai("grok-3-mini");
    case "grok-3":
      return xai("grok-3-mini");
    case "grok-3-mini":
      return xai("grok-3-mini");
    case "deepseek-v3":
      return deepseek("Pro/deepseek-ai/DeepSeek-V3");
    case "deepseek-r1":
      return deepseek("Pro/deepseek-ai/DeepSeek-R1");
    case "qwen3-235b-a22b":
      return siliconflow("Qwen/Qwen3-235B-A22B");
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

/**
 * https://github.com/vercel/ai/blob/9b09f85143986636570e597c31903daf160608cd/packages/amazon-bedrock/src/convert-to-bedrock-chat-messages.ts#L117C1-L118C1
 * bedrock 有个问题，file 的 name 在每次准备 bedrock api payload 的时候会产生一个新的，导致包含这个消息的 prompt cache checkpoint 失效
 * 这里简单修复下，固定文件名
 */
export function fixFileNameInMessageToUsePromptCache(model: LanguageModel) {
  if (typeof model === "string") {
    return model;
  }
  if (!/\.anthropic\.claude/.test(model.modelId)) {
    // 只修复使用 bedrock provider 时的 claude 模型
    return model;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalGetArgs = (model as any).getArgs;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (model as any).getArgs = function (params: any) {
    const res = originalGetArgs.call(model, params);
    const { command, warnings } = res;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = command.messages.map((message: any) => {
      if (Array.isArray(message.content)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content = message.content.map((part: any, index: number) => {
          if (part.document) {
            // 有些模型限制 name 不能一样，需要加上 index，依然可以保持命名固定
            const document = { ...part.document, name: `document_${index}` };
            return { ...part, document };
          } else {
            return part;
          }
        });
        return { ...message, content };
      } else {
        return message;
      }
    });
    return { command: { ...command, messages }, warnings };
  };
  return model;
}
