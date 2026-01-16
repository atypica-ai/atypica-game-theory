import { z } from "zod";

export const exportFolderInputSchema = z.object({
  folderPath: z
    .string()
    .describe("The folder path to export (e.g., 'my-project' or 'ai-product-growth')"),
});

export type ExportFolderInput = z.infer<typeof exportFolderInputSchema>;

export const exportFolderOutputSchema = z.object({
  success: z.boolean(),
  downloadToken: z.string().optional().describe("Token to download the zip file"),
  message: z.string().describe("Result message"),
  fileCount: z.number().optional().describe("Number of files exported"),
  plainText: z.string().describe("Plain text representation of the result"),
});

export type ExportFolderOutput = z.infer<typeof exportFolderOutputSchema>;
