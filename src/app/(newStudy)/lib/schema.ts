import { z } from "zod";

/**
 * Schema for AI-generated research template shortcuts
 *
 * Used by both public and personal template generation
 */
export const generatedShortcutsSchema = z.object({
  shortcuts: z
    .array(
      z.object({
        title: z
          .string()
          .describe(
            "Concise and natural research title starting with a relevant emoji, followed by the title text (12-30 Chinese characters, or 6-15 English words) that clearly expresses the research direction. AVOID formulaic patterns like '角色专题：'. Use natural, engaging language. Good examples: '🏕️ 露营装备的使用场景创新', '☕ 咖啡消费决策中的情感因素', '🚗 电动车购买的真实顾虑'. Bad examples: '产品经理专题：XX', 'XX人员专题：YY'.",
          ),
        description: z
          .string()
          .describe(
            "Detailed research brief (200-400 Chinese characters, or 100-200 English words). Must include specific trigger keywords to ensure Plan Mode selects the correct research methods shown in tags. For Focus Group: use words like 'bring together', 'discuss', 'debate', 'compare perspectives', 'weigh trade-offs'. For Deep Interview: use 'one-on-one interview', 'personal experience', 'decision journey'. For Social Observation: use 'observe social media', 'listen to conversations on [platform]'.",
          ),
        tags: z
          .array(z.string())
          .describe(
            "2-3 research method tags that describe the research workflow. Must match the language of the content (Chinese tags for Chinese scenarios, English tags for English scenarios). The last tag should usually be the final output type.",
          ),
        category: z
          .enum([
            "product-testing",
            "persona-building",
            "content-generation",
            "deep-interview",
            "market-analysis",
          ])
          .describe("Research category that best fits this study"),
      }),
    )
    .describe(
      "Generate 6-12 diverse and inspiring research scenarios based on the given context and requirements. The exact number and focus should align with the instructions in the system prompt.",
    ),
});
