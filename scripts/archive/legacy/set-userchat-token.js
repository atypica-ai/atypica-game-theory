const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

export const generateToken = (length = 16) =>
  Array(length)
    .fill(0)
    .map(
      () => "abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXY346792"[Math.floor(Math.random() * 51)],
    )
    .join("");

async function setUserChatToken() {
  try {
    const userChats = await prisma.userChat.findMany({
      where: { token: null },
      select: {
        id: true,
      },
    });
    const promises = [];
    for (const chat of userChats) {
      const token = generateToken();
      promises.push(
        prisma.userChat.update({
          where: { id: chat.id },
          data: { token },
        }),
      );
      if (promises.length >= 10) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }
    await Promise.all(promises);
  } catch (error) {
    console.log("Error setting user chat token:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function migrateScoutTask() {
  try {
    const studyUserChats = await prisma.userChat.findMany({
      where: { kind: "study" },
      select: { id: true },
    });
    console.log(`${studyUserChats.length} study user chats`);
    for (const { id: chatId } of studyUserChats) {
      const messages = [];
      const chat = await prisma.userChat.findUnique({
        where: { id: chatId },
        select: { id: true, messages: true },
      });
      console.log(chat.id);
      for (const message of chat.messages) {
        if (!message.parts) {
          messages.push(message);
          continue;
        }
        const parts = [];
        for (const part of message.parts) {
          if (part.type !== "tool-invocation") {
            parts.push(part);
            continue;
          }
          const toolInvocation = { ...part.toolInvocation };
          if (toolInvocation.toolName === "scoutTaskCreate") {
            if (
              toolInvocation.result.scoutUserChatId &&
              !toolInvocation.result.scoutUserChatToken
            ) {
              console.log("old", toolInvocation);
              const scoutUserChat = await prisma.userChat.findUnique({
                where: { id: toolInvocation.result.scoutUserChatId, kind: "scout" },
              });
              toolInvocation.result.scoutUserChatToken = scoutUserChat.token;
              console.log("new", toolInvocation);
            }
          }
          if (toolInvocation.toolName === "scoutTaskChat") {
            if (toolInvocation.args.scoutUserChatId && !toolInvocation.args.scoutUserChatToken) {
              console.log("old", toolInvocation);
              const scoutUserChat = await prisma.userChat.findUnique({
                where: { id: toolInvocation.args.scoutUserChatId, kind: "scout" },
              });
              toolInvocation.args.scoutUserChatToken = scoutUserChat.token;
              console.log("new", toolInvocation);
            }
          }
          parts.push({ ...part, toolInvocation });
        }
        messages.push({ ...message, parts });
      }
      await prisma.userChat.update({
        where: { id: chat.id },
        data: { messages },
      });
    }
  } catch (error) {
    console.log("Error migrating messages:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行导入
// await setUserChatToken();
await migrateScoutTask();
