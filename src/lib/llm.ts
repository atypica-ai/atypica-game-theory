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

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
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

export const providerOptions = {
  openai: {
    stream_options: { include_usage: true },
    // IMPORTANT: litellm 不支持这个 bedrock 的参数输入，但是在 litellm model 配置里设置了，它会发给 bedrock api
    // anthropic_beta: ["token-efficient-tools-2025-02-19"],
  },
};

export type LLMModelName =
  | "gpt-4o"
  | "claude-3-7-sonnet"
  | "claude-3-7-sonnet-beta"
  | "gemini-2.5-flash"
  | "deepseek-v3"
  | "deepseek-r1";

export function llm(
  modelName: LLMModelName,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any,
) {
  const deployRegion = getDeployRegion();
  if (deployRegion === "mainland") {
    return openai(modelName, options);
  } else {
    switch (modelName) {
      case "gpt-4o":
        return azure("gpt-4o", options);
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
      case "deepseek-v3":
        return deepseek("Pro/deepseek-ai/DeepSeek-V3", options);
      case "deepseek-r1":
        return deepseek("Pro/deepseek-ai/DeepSeek-R1", options);
    }
  }
}
