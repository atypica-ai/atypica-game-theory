import "server-only";

import { rootLogger } from "@/lib/logging";
import { getMcpRequestContext } from "@/lib/mcp";
import { prismaRO } from "@/prisma/prisma";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const getPersonaInputSchema = z.object({
  personaId: z.number().describe("The persona ID"),
});

export async function handleGetPersona(
  args: z.infer<typeof getPersonaInputSchema>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
): Promise<CallToolResult> {
  try {
    const context = getMcpRequestContext();
    if (!context?.userId) {
      throw new Error("Missing userId in request context");
    }

    const { personaId } = args;
    const userId = context.userId;

    const persona = await prismaRO.persona.findUnique({
      where: { id: personaId },
      select: {
        id: true,
        token: true,
        name: true,
        source: true,
        prompt: true,
        tier: true,
        tags: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
        personaImport: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!persona) {
      throw new Error("Persona not found");
    }

    if (persona.personaImport?.userId !== userId) {
      throw new Error("Unauthorized: Persona does not belong to user");
    }

    return {
      content: [
        {
          type: "text",
          text: `Persona: ${persona.name}\nSource: ${persona.source}\nTier: ${persona.tier}`,
        },
      ],
      structuredContent: {
        personaId: persona.id,
        token: persona.token,
        name: persona.name,
        source: persona.source,
        prompt: persona.prompt,
        tier: persona.tier,
        tags: persona.tags as string[],
        locale: persona.locale,
        createdAt: persona.createdAt.toISOString(),
        updatedAt: persona.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    rootLogger.error({ msg: "Failed to get persona", error: errorMessage });
    return {
      content: [{ type: "text", text: `Error getting persona: ${errorMessage}` }],
      isError: true,
    };
  }
}
