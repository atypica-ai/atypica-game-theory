"server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { generateText, tool, ToolSet } from "ai";
import { z } from "zod";
import type { ZodSchema } from "zod";

/**
 * Constant system prompt for parsing structured data from text
 */
const PARSER_SYSTEM_PROMPT = `You are a precise data extraction expert. Your task is to parse structured information from text and output it in the exact format specified by the schema.

# Instructions
- Extract all relevant data from the provided text
- Follow the schema structure exactly
- Return empty arrays/objects if no data is found (do not make up data)
- Preserve all details accurately
- Handle edge cases gracefully
- You MUST call the outputParsedData tool with your parsed result`;

/**
 * Constant user prompt template for parsing
 */
const PARSER_USER_PROMPT_TEMPLATE = (text: string) => `Parse the following text and extract structured data according to the schema:

${text}

Extract all relevant information and call the outputParsedData tool with the parsed result in the exact format specified by the schema.`;

/**
 * Creates a parser function that uses generateText with a tool call pattern
 * 
 * @param schema - Zod schema defining the output structure
 * @returns A parser function that takes text and returns parsed object
 * 
 * @example
 * ```ts
 * const postSchema = z.object({
 *   posts: z.array(z.object({
 *     postId: z.string(),
 *     content: z.string(),
 *     views: z.number(),
 *   }))
 * });
 * 
 * const parsePosts = createStructuredExtractor(postSchema);
 * const result = await parsePosts(text);
 * // result.posts is typed correctly
 * ```
 */
export function createStructuredExtractor<TSchema extends ZodSchema>(schema: TSchema) {
  return async (
    text: string,
    options?: {
      abortSignal?: AbortSignal;
      logger?: import("pino").Logger;
    },
  ): Promise<z.infer<TSchema>> => {
    const { abortSignal, logger } = options || {};

    // Create tool that accepts the parsed object as input
    // Ensure schema is a ZodObject (wrap if needed)
    const toolSchema = schema instanceof z.ZodObject 
      ? schema 
      : z.object({ data: schema });
    
    const outputParsedDataTool = tool({
      description: "Output the parsed structured data extracted from the text",
      inputSchema: toolSchema,
      execute: async () => {
        return { success: true };
      },
    });

    const tools: ToolSet = {
      outputParsedData: outputParsedDataTool,
    } as ToolSet;

    try {
      const result = await generateText({
        model: llm("gpt-5-mini"),
        providerOptions: defaultProviderOptions(),
        system: PARSER_SYSTEM_PROMPT,
        prompt: PARSER_USER_PROMPT_TEMPLATE(text),
        tools,
        toolChoice: "required",
        abortSignal,
        maxRetries: 2,
      });

      // Extract parsed data from tool call input
      const toolCall = result.steps
        .flatMap((step) => step.toolCalls || [])
        .find((call) => call.toolName === "outputParsedData");

      if (!toolCall) {
        throw new Error("No outputParsedData tool call found in response");
      }

      const parsedInput = toolCall.input as z.infer<typeof toolSchema>;
      
      // If schema was wrapped, extract the data field; otherwise return as-is
      if (schema instanceof z.ZodObject) {
        return parsedInput as z.infer<TSchema>;
      } else {
        return (parsedInput as { data: z.infer<TSchema> }).data;
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      logger?.error({
        msg: "Parser failed to extract structured data",
        error: errorMessage,
        textPreview: text.slice(0, 1000),
        textLength: text.length,
        stack: (error as Error).stack,
      });
      
      throw error;
    }
  };
}

