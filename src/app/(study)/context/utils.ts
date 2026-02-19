import "server-only";

import { createPersonaPanel } from "@/app/(panel)/lib/persistence";
import { PersonaPanel } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { ITXClientDenyList } from "@prisma/client/runtime/client";
import { UserChatContext } from "./types";

export async function mergeUserChatContext({
  id,
  context,
  tx,
}: {
  id: number;
  context: UserChatContext;
  tx?: Omit<typeof prisma, ITXClientDenyList>;
}) {
  if (!tx) tx = prisma;
  await tx.$executeRaw`
    UPDATE "UserChat"
    SET "context" = COALESCE("context", '{}') || ${JSON.stringify({ ...context })}::jsonb,
        "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;
}

const mergeIds = (ids1: number[], ids2: number[]) => Array.from(new Set([...ids1, ...ids2]));

/**
 * 如果 userchat 上已经有了 persona panel，会合并 personaIds 后复用
 * 如果没有，会创建一个新的
 * 会存在并发写入的问题，解决方法是在更新 context 字段的时候使用 context 的 json filter 过滤一下 personaPanelId is null
 */
export async function recordPersonaPanelContext({
  userId,
  userChatId,
  personaIds,
  instruction,
}: {
  userId: number;
  userChatId: number;
  personaIds: number[];
  instruction?: string;
}) {
  const { context } = await prisma.userChat.findUniqueOrThrow({
    where: { id: userChatId },
    select: { context: true },
  });
  let personaPanel: PersonaPanel;
  if (!context.personaPanelId) {
    personaPanel = await createPersonaPanel({
      userId,
      personaIds,
      instruction,
    });
    await mergeUserChatContext({
      id: userChatId,
      context: {
        personaPanelId: personaPanel.id,
      },
    });
  } else {
    const personaPanelId = context.personaPanelId;
    personaPanel = await prisma.personaPanel.findUniqueOrThrow({
      where: { id: personaPanelId },
    });
    // Skip write if personaIds are already contained and no new instruction
    const allContained = personaIds.every((id) => personaPanel.personaIds.includes(id));
    if (allContained && !instruction) {
      return personaPanel;
    }
    personaPanel = await prisma.personaPanel.update({
      where: { id: personaPanelId },
      data: {
        userId,
        personaIds: mergeIds(personaPanel.personaIds, personaIds),
        instruction: [personaPanel.instruction, instruction].filter(Boolean).join("\n"),
      },
    });
  }
  return personaPanel;
}
