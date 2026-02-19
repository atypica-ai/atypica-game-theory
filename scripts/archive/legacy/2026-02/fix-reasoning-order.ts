// pnpm tsx scripts/utils/fix-reasoning-order.ts
// 遍历最近 100 个 study/universal kind 的 UserChat，
// 检查 assistant 消息的 parts 顺序，如果 reasoning 不在最前面则移动上去

import "../mock-server-only";

import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());

  const { prisma } = await import("@/prisma/prisma");
  const { convertDBMessageToAIMessage } = await import("@/ai/messageUtils");

  console.log("Scanning recent 100 study/universal chats for reasoning order issues...");

  const userChats = await prisma.userChat.findMany({
    where: { kind: { in: ["study", "universal"] } },
    orderBy: { id: "desc" },
    take: 100,
    select: { id: true, token: true },
  });

  console.log(`Found ${userChats.length} chats to scan`);

  let totalFixed = 0;
  let totalScanned = 0;

  for (const chat of userChats) {
    const messages = (
      await prisma.chatMessage.findMany({
        where: { userChatId: chat.id, role: "assistant" },
        orderBy: { id: "asc" },
      })
    ).map(convertDBMessageToAIMessage);

    for (const message of messages) {
      totalScanned++;
      const parts = message.parts;
      if (!Array.isArray(parts) || parts.length < 2) continue;

      // 找到第一个 reasoning part 的位置
      const firstReasoningIndex = parts.findIndex((p) => p.type === "reasoning");
      if (firstReasoningIndex <= 0) continue; // -1 = 没有 reasoning, 0 = 已经在最前面

      // 确认第一个 part 不是 reasoning（即 reasoning 被排到了后面）
      const firstNonReasoning = parts.findIndex((p) => p.type !== "reasoning");
      if (firstNonReasoning === -1 || firstNonReasoning > firstReasoningIndex) continue;

      // 需要修复：把所有 reasoning parts 提到最前面，保持其他 parts 的相对顺序
      const reasoningParts = parts.filter((p) => p.type === "reasoning");
      const otherParts = parts.filter((p) => p.type !== "reasoning");
      const reordered = [...reasoningParts, ...otherParts];

      await prisma.chatMessage.update({
        where: {
          messageId: message.id,
        },
        data: {
          parts: reordered,
        },
      });

      totalFixed++;
      console.log(
        `Fixed message ${message.id} in chat ${chat.token} ` +
          `(${reasoningParts.length} reasoning parts moved to front, ${parts.length} total parts)`,
      );
    }
  }

  console.log(`\nDone! Scanned ${totalScanned} messages, fixed ${totalFixed}`);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Script failed:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
