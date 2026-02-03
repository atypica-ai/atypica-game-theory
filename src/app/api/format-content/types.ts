import { VALID_LOCALES } from "@/i18n/routing";
import { z } from "zod";

/**
 * Request schema for format-content API
 */
export const formatContentRequestSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  locale: z.enum(VALID_LOCALES),
  instruction: z.string().optional(),
});

export type FormatContentRequest = z.infer<typeof formatContentRequestSchema>;
