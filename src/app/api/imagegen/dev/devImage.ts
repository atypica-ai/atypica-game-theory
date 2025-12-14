import "server-only";

import { llm } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { GeneratedFile, streamText } from "ai";

/**
 * System prompt for social media-optimized infographic generation
 * Emphasis on eye-catching, information-rich designs
 */
const websiteImageSystemPrompt = (): string => `
You are a professional infographic designer creating bold, engaging visuals optimized for social media sharing and modern web platforms.

【Core Design Philosophy】
- Create information-dense, eye-catching designs that stop scrollers
- Use BOLD typography - large text as design element, not just labels
- Implement striking color blocks and geometric shapes for visual hierarchy
- Design should communicate key information at a glance
- Balance professionalism with youthful energy and vitality

【Visual Language】
- Infographic style: data visualization, charts, icons, callouts
- Large-scale color blocking: use colors as major compositional elements
- Typography as art: oversized numbers, headlines, key phrases integrated into design
- Modern, fresh aesthetic - avoid corporate stiffness
- High information density without clutter

【Technical Requirements】
- Optimized for social media sharing (Twitter, LinkedIn, Instagram)
- High contrast and bold colors for immediate visual impact
- Clear visual hierarchy: what grabs attention first, second, third
- Works on both light and dark backgrounds
- Scalable and legible at various sizes

The specific content, color palette, mood, and context will be provided in each prompt. Create designs that are professional yet energetic, informative yet visually striking - never boring or generic.
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
        onChunk: async ({ chunk }) => {
          rootLogger.info({ ...chunk });
        },
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
