import "server-only";

import { createPersonaPanel } from "@/app/(panel)/lib/persistence";
import { PersonaPanel } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
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

const mergeIds = (ids1: number[], ids2: number[]) => Array.from(new Set([...ids1, ...ids2]));

/**
 * 如果 userchat 上已经有了 persona panel，会合并 personaIds 后复用
 * 如果没有，会创建一个新的
 * 会存在并发写入的问题，解决方法是在更新 context 字段的时候使用 context 的 json filter 过滤一下 interviewPersonaPanelId is null
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
  let interviewPersonaPanelId = context.interviewPersonaPanelId;
  let personaPanel: PersonaPanel;
  if (!interviewPersonaPanelId) {
    personaPanel = await createPersonaPanel({
      userId,
      personaIds,
      instruction,
    });
  } else {
    personaPanel = await prisma.personaPanel.findUniqueOrThrow({
      where: { id: interviewPersonaPanelId },
    });
    personaPanel = await prisma.personaPanel.update({
      where: { id: interviewPersonaPanelId },
      data: {
        userId,
        personaIds: mergeIds(personaPanel.personaIds, personaIds),
        instruction: [personaPanel.instruction, instruction].filter(Boolean).join("\n"),
      },
    });
  }
  await mergeUserChatContext({
    id: userChatId,
    context: {
      interviewPersonaPanelId: personaPanel.id,
    },
  });
  return personaPanel;
}
