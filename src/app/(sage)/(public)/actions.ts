"use server";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import type { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import { generateToken } from "@/lib/utils";
import type { Sage, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import z from "zod";
import { createSageInputSchema } from "../types";

/**
 * Create a new sage with initial content
 * No automatic processing - user must trigger manually
 */
export async function createSage(
  input: z.infer<typeof createSageInputSchema>,
): Promise<ServerActionResult<{ sage: Sage; userChat: UserChat }>> {
  return withAuth(async (user) => {
    const parseResult = createSageInputSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        message: "Malformed input",
      };
    }
    const validated = parseResult.data;
    const sage = await prisma.sage.create({
      data: {
        token: generateToken(),
        userId: user.id,
        name: validated.name,
        domain: validated.domain,
        locale: validated.locale,
        expertise: [],
        bio: "",
        extra: {},
        // Create sources
        sources: {
          create: validated.sources.map((source) => ({
            content: source,
            title: "",
            extractedText: "",
          })),
        },
      },
    });

    rootLogger.info({
      msg: "Created sage with sources",
      sageId: sage.id,
      userId: user.id,
      sourcesCount: validated.sources.length,
    });

    // Create a UserChat for management/viewing
    const userChat = await createUserChat({
      userId: user.id,
      kind: "misc",
      title: `Sage: ${validated.name}`,
    });

    return {
      success: true,
      data: { sage, userChat },
    };
  });
}

/**
 * List user's sages
 */
export async function listMySages(): Promise<
  ServerActionResult<Array<Sage & { _count: { chats: number; interviews: number } }>>
> {
  return withAuth(async (user) => {
    try {
      const sages = await prisma.sage.findMany({
        where: { userId: user.id },
        include: {
          _count: {
            select: {
              chats: true,
              interviews: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return {
        success: true,
        data: sages,
      };
    } catch (error) {
      rootLogger.error(`Failed to list sages: ${error}`);
      return {
        success: false,
        message: "Failed to list sages",
        code: "internal_server_error",
      };
    }
  });
}
