const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

async function fixDuplicatedRequestInteraction() {
  try {
    const chatMessages = await prisma.ChatMessage.findMany({
      where: {
        userChat: {
          kind: "study",
        },
        role: "assistant",
        messageId: {
          startsWith: "msg-",
        },
      },
      select: { id: true },
      orderBy: { id: "desc" },
    });
    console.log(`${chatMessages.length} chat messages`);
    let count = 0;
    let promises = [];
    for (const { id } of chatMessages) {
      const promise = (async () => {
        const message = await prisma.ChatMessage.findUniqueOrThrow({
          where: { id },
        });
        console.log(message.id, message.parts[0]?.content);
        const [zero, first, second] = message.parts;
        if (
          zero?.type !== "step-start" ||
          first?.type !== "text" ||
          second?.type !== "tool-invocation" ||
          second.toolInvocation.toolName !== "requestInteraction" ||
          second.toolInvocation.state !== "result"
        ) {
          return;
        }
        const lastMessage = await prisma.ChatMessage.findFirst({
          where: {
            userChatId: message.userChatId,
            id: { lt: message.id },
            role: "assistant",
          },
          orderBy: { id: "asc" },
        });
        const [lastFirst, lastSecond] = lastMessage?.parts ?? [];
        if (
          lastMessage?.parts.length !== 2 ||
          lastFirst?.type != "text" ||
          lastSecond?.type != "tool-invocation" ||
          lastSecond.toolInvocation.toolName != "requestInteraction" ||
          lastSecond.toolInvocation.state !== "call"
        ) {
          return;
        }
        if (
          lastFirst.text === first.text &&
          lastSecond.toolInvocation.toolCallId === second.toolInvocation.toolCallId
        ) {
          const userChat = await prisma.UserChat.findUniqueOrThrow({
            where: { id: message.userChatId },
          });
          console.log(
            "!!!FOUND",
            ++count,
            lastMessage.id,
            message.id,
            userChat.id,
            userChat.token,
            message.content.substring(0, 20),
            lastMessage.content.substring(0, 20),
          );
          await prisma.chatMessage.delete({
            where: {
              id: lastMessage.id,
            },
          });
        }
      })(id);
      promises.push(promise);
      if (promises.length >= 100) {
        await Promise.all(promises);
        promises = [];
      }
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  } catch (error) {
    console.log("Error fix duplicated request interaction:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await fixDuplicatedRequestInteraction();
}

await main();
