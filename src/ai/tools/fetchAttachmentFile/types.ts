import z from "zod/v3";

export const fetchAttachmentFileInputSchema = z.object({
  attachmentId: z
    .number()
    .describe("The attachment ID shown as [#N filename] in messages, e.g. 1 for [#1 ...]"),
  mode: z
    .enum(["full", "head", "tail", "head_tail"])
    .default("full")
    .describe(
      "Reading mode: full=entire content, head=first N chars, tail=last N chars, head_tail=first and last N chars with ... separator",
    ),
  limit: z
    .number()
    .optional()
    .default(2000)
    .describe("Character limit per segment (for head/tail/head_tail modes)"),
});

export type FetchAttachmentFileToolInput = z.infer<typeof fetchAttachmentFileInputSchema>;

export const fetchAttachmentFileOutputSchema = z.object({
  plainText: z.string(),
  image: z
    .object({
      data: z.string(),
      mimeType: z.string(),
    })
    .optional(),
});

export type FetchAttachmentFileToolResult = z.infer<typeof fetchAttachmentFileOutputSchema>;
