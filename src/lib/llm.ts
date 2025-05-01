import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAzure } from "@ai-sdk/azure";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { getDeployRegion } from "./deployRegion";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
  compatibility: "strict", // so stream_options will be sent
});

const deepseek = createDeepSeek({
  apiKey: process.env.SILICONFLOW_API_KEY,
  baseURL: process.env.SILICONFLOW_BASE_URL,
});

const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME,
  apiKey: process.env.AZURE_API_KEY,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  });
  return googleGenerativeAI(modelId, settings);
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
  | "o3-mini"
  | "claude-3-7-sonnet"
  | "claude-3-7-sonnet-beta"
  | "gemini-2.5-flash"
  | "gemini-2.5-pro"
  | "deepseek-v3"
  | "deepseek-r1";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function llm(modelName: LLMModelName, options?: any) {
  const deployRegion = getDeployRegion();
  if (deployRegion === "mainland") {
    switch (modelName) {
      case "claude-3-7-sonnet":
        return bedrock("us.anthropic.claude-3-7-sonnet-20250219-v1:0", options);
      case "claude-3-7-sonnet-beta":
        return bedrock("us.anthropic.claude-3-7-sonnet-20250219-v1:0", {
          additionalModelRequestFields: {
            anthropic_beta: ["token-efficient-tools-2025-02-19"],
          },
        });
      case "gemini-2.5-flash":
        return google("gemini-2.5-flash-preview-04-17", options);
      case "gemini-2.5-pro":
        return google("gemini-2.5-pro-preview-03-25", options);
      default:
        return openai(modelName, options); // options 支持 parallelToolCalls 参数
    }
  } else {
    switch (modelName) {
      case "gpt-4o":
        return azure("gpt-4o", options); // options 支持 parallelToolCalls 参数
      case "o3-mini":
        return azure("o3-mini", options);
      case "claude-3-7-sonnet":
        return bedrock("us.anthropic.claude-3-7-sonnet-20250219-v1:0", options);
      case "claude-3-7-sonnet-beta":
        return bedrock("us.anthropic.claude-3-7-sonnet-20250219-v1:0", {
          additionalModelRequestFields: {
            anthropic_beta: ["token-efficient-tools-2025-02-19"],
          },
        });
      case "gemini-2.5-flash":
        return google("gemini-2.5-flash-preview-04-17", options);
      case "gemini-2.5-pro":
        return google("gemini-2.5-pro-preview-03-25", options);
      case "deepseek-v3":
        return deepseek("Pro/deepseek-ai/DeepSeek-V3", options);
      case "deepseek-r1":
        return deepseek("Pro/deepseek-ai/DeepSeek-R1", options);
    }
  }
}
