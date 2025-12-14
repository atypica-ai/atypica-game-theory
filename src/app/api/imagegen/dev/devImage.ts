import "server-only";

import { llm } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { GeneratedFile, streamText } from "ai";

/**
 * System prompt for website illustration generation
 * Designed for modern, professional illustrations suitable for tech/SaaS websites
 */
const websiteImageSystemPrompt = (): string => `
You are a professional website illustration designer specializing in modern, clean, and engaging visuals for technology and business websites.

【Core Requirements】
- Generate professional illustrations for website sections
- Modern, minimalist design aesthetic
- Suitable for tech/SaaS/business context
- Clean, professional color palettes
- Focus on clarity and visual hierarchy

【Style Guidelines】
- Contemporary illustration style (not photorealistic)
- Use of geometric shapes and clean lines
- Professional color schemes (blues, greens, purples, neutrals)
- Subtle gradients and depth
- Icon-style elements when appropriate

【Technical Requirements】
- High contrast for web display
- Work well on both light and dark backgrounds
- Scalable and clear at various sizes
- Professional and trustworthy appearance

【Purpose】
These images will be used as hero images, feature illustrations, and section backgrounds on a modern business website. They should enhance the content without overwhelming it.

When given a prompt, interpret it as a description of the desired content and purpose rather than a literal text-to-image instruction. Use your design judgment to create professional illustrations that fit the website context.
`;

/**
 * Generate website illustration using Gemini 2.5 Flash Image (Development only)
 *
 * This function uses reasoning-based prompts rather than traditional text-to-image prompts.
 * Describe WHAT to show, WHY (purpose), and the desired STYLE.
 *
 * @param prompt - Reasoning-based description (e.g., "Create illustration showing X. Purpose: Y. Style: Z.")
 * @param ratio - Image aspect ratio
 * @param promptHash - Hash for caching/identification
 * @returns Image data (uint8Array and mediaType) for route.ts to handle S3 upload
 */
export async function generateDevImage({
  prompt,
  ratio,
  promptHash,
}: {
  prompt: string;
  ratio: "square" | "landscape" | "portrait";
  promptHash: string;
}): Promise<{ uint8Array: Uint8Array; mediaType: string }> {
  rootLogger.info({ msg: "Starting website image generation", promptHash, prompt });

  const result = await new Promise<{ text: string; files: GeneratedFile[] }>(
    async (resolve, reject) => {
      const response = streamText({
        // model: llm("gemini-2.5-flash-image"),
        model: llm("gemini-3-pro-image"),
        providerOptions: {
          google: {
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio: ratio === "square" ? "1:1" : ratio === "landscape" ? "16:9" : "9:16",
              imageSize: "2K",
            },
          } satisfies GoogleGenerativeAIProviderOptions,
        },
        temperature: 0,
        system: websiteImageSystemPrompt(),
        prompt,
        abortSignal: AbortSignal.timeout(300 * 1000), // 5 minutes timeout
        maxRetries: 3,
        onFinish: async ({ text, files }) => {
          resolve({ text, files });
        },
        onError: ({ error }) => {
          reject(error);
        },
      });

      await response
        .consumeStream()
        .then(() => {})
        .catch((error) => reject(error));
    },
  );

  // Extract image file from response
  let imageFile = null;
  if (result.files && result.files.length > 0) {
    for (const file of result.files) {
      if (file.mediaType.startsWith("image/")) {
        imageFile = file;
        break;
      }
    }
  }

  if (!imageFile) {
    rootLogger.error({ msg: "No image file generated", promptHash });
    throw new Error("No image file generated");
  }

  rootLogger.info({
    msg: "Image generated successfully",
    mediaType: imageFile.mediaType,
    promptHash,
  });

  return {
    uint8Array: imageFile.uint8Array,
    mediaType: imageFile.mediaType,
  };
}
