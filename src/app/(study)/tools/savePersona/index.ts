import { PlainTextToolResult } from "@/ai/tools/types";
import { createPersonaWithPostProcess } from "@/app/(persona)/lib";
import { tool } from "ai";
import {
  savePersonaInputSchema,
  savePersonaOutputSchema,
  type SavePersonaToolResult,
} from "./types";

export const savePersonaTool = ({
  scoutUserChatId,
  personaImportId,
  userId,
}: {
  scoutUserChatId?: number;
  personaImportId?: number;
  userId?: number;
}) =>
  tool({
    description:
      "Save a detailed user persona and its corresponding AI agent system prompt to the database for future interview simulations",
    inputSchema: savePersonaInputSchema,
    outputSchema: savePersonaOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({
      name,
      source,
      tags,
      // userids: samples,
      personaPrompt: prompt,
      locale,
    }): Promise<SavePersonaToolResult> => {
      const persona = await createPersonaWithPostProcess({
        name: name.slice(0, 50),
        source: source.slice(0, 200), // 为了数据库不报错，防御性的截断一下
        tags: tags.map((tag) => tag.slice(0, 50)),
        prompt,
        locale,
        scoutUserChatId,
        personaImportId,
        userId,
      });
      return {
        personaId: persona.id,
        plainText: `User persona "${name}" saved successfully with ID: ${persona.id}`,
      };
    },
  });
