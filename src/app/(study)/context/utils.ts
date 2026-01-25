import { prisma } from "@/prisma/prisma";
import "server-only";
import { UserChatContext } from "./types";

export async function mergeUserChatContext({
  id,
  context,
}: {
  id: number;
  context: UserChatContext;
}) {
  await prisma.$executeRaw`
    UPDATE "UserChat"
    SET "context" = COALESCE("context", '{}') || ${JSON.stringify({ ...context })}::jsonb,
        "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;
}
