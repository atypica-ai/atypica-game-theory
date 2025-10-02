import { fixMalformedUnicodeString, generateToken } from "@/lib/utils";
import z from "zod/v3";

export const generateReportInputSchema = z.object({
  instruction: z
    .string()
    .describe(
      "REQUIRED: Detailed report style descriptions. Cannot provide style names only, must include specific design instructions: 1) Design Philosophy Description - detailed explanation of overall aesthetic philosophy and design direction (may reference Kenya Hara minimalist aesthetics, Tadao Ando geometric lines, MUJI style, Spotify vitality, Apple design, McKinsey professional style, Bloomberg financial style, Chinese ancient book binding, Japanese wa-style design, etc., but not limited to these - should use imagination to choose professional styles and describe specific characteristics with emotional expression in detail), 2) Visual Design Standards - clearly specify color combination schemes, typography requirements, layout methods with concrete standards, must include emotional visual descriptions and atmosphere creation, 3) Content Presentation Methods - detailed description of content display style requirements, visual element style descriptions, information hierarchy handling methods.",
    )
    .transform(fixMalformedUnicodeString),
  reportToken: z
    .string()
    .optional()
    .describe(
      "Report token used to create records. You don't need to provide this - the system will automatically generate it",
    )
    // 始终生成一个新的 token，并且这个会直接覆盖 message 里面 toolInvocation.args 上的参数
    .transform(() => generateToken()),
});

export const generateReportOutputSchema = z.object({
  reportToken: z.string().optional(),
  plainText: z.string(),
});

export type GenerateReportResult = z.infer<typeof generateReportOutputSchema>;
