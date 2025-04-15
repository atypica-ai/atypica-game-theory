import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
  compatibility: "strict", // so stream_options will be sent
});

export const deepseek = createDeepSeek({
  apiKey: process.env.SILICONFLOW_API_KEY,
  baseURL: process.env.SILICONFLOW_BASE_URL,
});

const _bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const bedrock = (model: "claude-3-7-sonnet" = "claude-3-7-sonnet") => {
  if (model === "claude-3-7-sonnet") {
    return _bedrock("us.anthropic.claude-3-7-sonnet-20250219-v1:0", {
      additionalModelRequestFields: {
        // https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#disabling-parallel-tool-use
        // https://docs.anthropic.com/en/docs/build-with-claude/tool-use/token-efficient-tool-use
        // https://community.aws/content/2trguomubYb8f3JNzCeBgNvassc/claude-token-efficient-tool-use-on-amazon-bedrock
        // bedrock 和 anthropic 的接口格式不同
        anthropic_beta: ["token-efficient-tools-2025-02-19"],
      },
    });
  } else {
    return _bedrock(model);
  }
};
