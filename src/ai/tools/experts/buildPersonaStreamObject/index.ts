import "server-only";

import { prepareMessagesForStreaming } from "@/ai/messageUtils";
import { CONTINUE_ASSISTANT_STEPS } from "@/ai/messageUtilsClient";
import { buildPersonaSystem } from "@/ai/prompt";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { scoutChatTools } from "@/ai/tools/experts/scoutTaskChat/types";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { createPersonaWithPostProcess } from "@/app/(persona)/lib";
import { prisma } from "@/prisma/prisma";
import { streamObject, tool } from "ai";
import {
  buildPersonaStreamObjectInputSchema,
  buildPersonaStreamObjectOutputSchema,
  type BuildPersonaStreamObjectToolResult,
  personaBuildSchemaStreamObject,
} from "./types";

export const buildPersonaStreamObjectTool = ({
  userId,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  userId: number;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Analyze social media research data and build detailed user personas with AI agent simulation capabilities using streaming object generation",
    inputSchema: buildPersonaStreamObjectInputSchema,
    outputSchema: buildPersonaStreamObjectOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ scoutUserChatToken }) => {
      const scoutUserChat = await prisma.userChat.findUnique({
        where: { token: scoutUserChatToken, kind: "scout", userId },
      });
      if (!scoutUserChat) {
        return {
          personas: [],
          plainText: `scoutUserChat ${scoutUserChatToken} not found`,
        };
      }
      const scoutUserChatId = scoutUserChat.id;
      const response = await runBuildPersonaStreamObject({
        locale,
        scoutUserChatId,
        abortSignal,
        statReport,
        logger,
      });
      const object = await response.object;
      const personas: BuildPersonaStreamObjectToolResult["personas"] = [];
      // for (const [key, data] of Object.entries(object)) {
      //   logger.info(`Persona ${key} generated, ${data.name}`);
      for (const data of object) {
        logger.info(`Persona generated, ${data.name}`);
        if (data.personaPrompt.length < 20) {
          continue; // 如果字太少，忽略
        }
        try {
          const { name, source, tags, personaPrompt: prompt } = data;
          const persona = await createPersonaWithPostProcess({
            name: name.slice(0, 50),
            source: source.slice(0, 200), // 为了数据库不报错，防御性的截断一下
            tags: tags.map((tag) => tag.slice(0, 50)),
            prompt,
            locale,
            scoutUserChatId,
          });
          personas.push({ personaId: persona.id, name, tags, source });
        } catch (error) {
          logger.error(`Failed to create persona ${JSON.stringify(data)}: ${error}`);
        }
      }
      if (personas.length === 0) {
        logger.error("No valid personas generated");
        throw new Error("No valid personas generated");
      }
      if (statReport) {
        await statReport("personas", personas.length, {
          reportedBy: "buildPersona tool",
          scoutUserChatId,
          personaIds: personas.map((persona) => persona.personaId),
        });
      }
      return {
        personas,
        plainText: `${personas.length} user personas built successfully: ${JSON.stringify(personas)}`,
      };
    },
  });

export async function runBuildPersonaStreamObject({
  scoutUserChatId,
  locale,
  statReport,
  abortSignal,
  logger,
}: {
  scoutUserChatId: number;
} & AgentToolConfigArgs) {
  const { coreMessages } = await prepareMessagesForStreaming(scoutUserChatId, {
    tools: scoutChatTools({ locale, statReport, abortSignal, logger }),
  });
  let messages = coreMessages.filter(
    (message) => !(message.role === "user" && message.content === CONTINUE_ASSISTANT_STEPS),
  );
  if (messages.length && messages[messages.length - 1].role === "user") {
    messages = messages.slice(0, -1);
  }
  messages.push({
    role: "user",
    content: "build personas",
  });
  // const schema = z.object({
  //   persona1: personaBuildSchemaStreamObject(),
  //   persona2: personaBuildSchemaStreamObject(),
  //   persona3: personaBuildSchemaStreamObject(),
  //   persona4: personaBuildSchemaStreamObject(),
  //   persona5: personaBuildSchemaStreamObject(),
  //   persona6: personaBuildSchemaStreamObject(),
  // });
  const response = streamObject({
    model: llm("gemini-2.5-pro"),
    // model: llm("gpt-4.1"), // gpt 可以对一个字段的值进行 stream，这样在 prompt 生成部分的时候就可以看到结果，比较快
    // temperature: 0,
    providerOptions: defaultProviderOptions,
    system: buildPersonaSystem({
      locale,
      parallel: true,
    }),
    messages,
    output: "array",
    schema: personaBuildSchemaStreamObject(),
    // schema,
    onFinish: async (result) => {
      logger.info({
        msg: "Persona generation stream completed",
        // object: result.object,
        usage: result.usage,
      });
      if (statReport) {
        const { tokens, extra } = calculateStepTokensUsage(result);
        await statReport("tokens", tokens, {
          reportedBy: "buildPersona tool",
          scoutUserChatId,
          ...extra,
        });
      }
    },
    abortSignal,
  });
  return response;
}
