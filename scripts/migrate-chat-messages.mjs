import { PrismaClient } from "@prisma/client";
import { generateId } from "ai";

const prisma = new PrismaClient();

const generateToken = (length = 16) =>
  Array(length)
    .fill(0)
    .map(
      () => "abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXY346792"[Math.floor(Math.random() * 51)],
    )
    .join("");

async function migrateInterviewChatMessages() {
  // 需要为每个 interviewchat 创建一个 userchat
  try {
    const analystInterviews = await prisma.analystInterview.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
    });
    console.log(`${analystInterviews.length} interview user chats`);
    for (const { id: interviewId } of analystInterviews) {
      const interview = await prisma.analystInterview.findUnique({
        where: { id: interviewId },
        select: {
          id: true,
          messages: true,
          createdAt: true,
          analyst: {
            select: {
              topic: true,
              userAnalysts: true,
            },
          },
        },
      });
      if (!interview.messages.length) {
        console.log("interview", interview.id, "skipped");
        continue;
      }
      console.log("interview", interview.id, "migrating");
      // 需要创建一个 userChat, messages 是 []
      const userChat = await prisma.userChat.create({
        data: {
          userId: interview.analyst.userAnalysts[0].userId,
          token: generateToken(),
          title: interview.analyst.topic.substring(0, 50),
          messages: [],
          kind: "interview",
          createdAt: interview.createdAt,
          updatedAt: interview.updatedAt,
        },
      });
      await prisma.analystInterview.update({
        where: { id: interview.id },
        data: { interviewUserChatId: userChat.id },
      });
      let lastCreatedAt = interview.createdAt;
      for (const message of interview.messages) {
        let { id: messageId, role, content, parts, createdAt, ...extra } = message;
        if (!messageId) {
          messageId = generateId();
        }
        if (!createdAt) {
          createdAt = lastCreatedAt;
        } else {
          createdAt = new Date(createdAt);
          lastCreatedAt = createdAt;
        }
        if (!parts) {
          parts = [];
        }
        console.log(
          createdAt,
          messageId,
          role,
          "content:",
          content?.length,
          "parts:",
          parts?.length,
          "extra:",
          JSON.stringify(extra).length,
        );
        await prisma.chatMessage.create({
          data: {
            messageId,
            userChatId: userChat.id,
            role,
            content,
            parts,
            extra,
            createdAt,
            updatedAt: createdAt,
          },
        });
      }
      await prisma.analystInterview.update({
        where: { id: interview.id },
        data: { messages: [] },
      });
    }
  } catch (error) {
    console.log("Error migrating messages:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function migrateUserChatMessages() {
  try {
    const studyUserChats = await prisma.userChat.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
    });
    console.log(`${studyUserChats.length} study user chats`);
    for (const { id: chatId } of studyUserChats) {
      const userChat = await prisma.userChat.findUnique({
        where: { id: chatId },
        select: { id: true, messages: true, createdAt: true },
      });
      if (!userChat.messages.length) {
        console.log("userchat", userChat.id, "skipped");
        continue;
      }
      console.log("userchat", userChat.id, "migrating");
      let lastCreatedAt = userChat.createdAt;
      for (const message of userChat.messages) {
        let { id: messageId, role, content, parts, createdAt, ...extra } = message;
        if (!messageId) {
          messageId = generateId();
        }
        if (!createdAt) {
          createdAt = lastCreatedAt;
        } else {
          createdAt = new Date(createdAt);
          lastCreatedAt = createdAt;
        }
        if (!parts) {
          parts = [];
        }
        console.log(
          createdAt,
          messageId,
          role,
          "content:",
          content?.length,
          "parts:",
          parts?.length,
          "extra:",
          JSON.stringify(extra).length,
        );
        await prisma.chatMessage.create({
          data: {
            messageId,
            userChatId: userChat.id,
            role,
            content,
            parts,
            extra,
            createdAt,
            updatedAt: createdAt,
          },
        });
      }
      await prisma.userChat.update({
        where: { id: userChat.id },
        data: { messages: [] },
      });
    }
  } catch (error) {
    console.log("Error migrating messages:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await migrateUserChatMessages();
  await migrateInterviewChatMessages();
}

await main();
