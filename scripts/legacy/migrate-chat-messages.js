const { PrismaClient } = require("../src/prisma/client");
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
    let promises = [];
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
      const promise = (async (interview) => {
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
        const records = [];
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
          records.push({
            messageId,
            userChatId: userChat.id,
            role,
            content,
            parts,
            extra,
            createdAt,
            updatedAt: createdAt,
          });
        }
        await prisma.chatMessage.createMany({ data: records });
        await prisma.analystInterview.update({
          where: { id: interview.id },
          data: { messages: [] },
        });
      })(interview);
      promises.push(promise);
      if (promises.length >= 20) {
        await Promise.all(promises);
        promises = [];
      }
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  } catch (error) {
    console.log("Error migrating messages:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function migrateUserChatMessages() {
  try {
    const userChats = await prisma.userChat.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
    });
    let promises = [];
    for (const { id: chatId } of userChats) {
      const userChat = await prisma.userChat.findUnique({
        where: { id: chatId },
        select: { id: true, messages: true, createdAt: true },
      });
      if (!userChat.messages.length) {
        console.log("userchat", userChat.id, "skipped");
        continue;
      }
      const promise = (async (userChat) => {
        console.log("userchat", userChat.id, "migrating");
        let lastCreatedAt = userChat.createdAt;
        const records = [];
        for (const message of userChat.messages) {
          let { id: messageId, role, content: _content, parts, createdAt, ...extra } = message;
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
          let content = _content;
          if (userChat.id === 558) {
            content = content.substring(0, 5000); // 这个消息有问题，太长了
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
          records.push({
            messageId,
            userChatId: userChat.id,
            role,
            content,
            parts,
            extra,
            createdAt,
            updatedAt: createdAt,
          });
        }
        await prisma.chatMessage.createMany({ data: records });
        await prisma.userChat.update({
          where: { id: userChat.id },
          data: { messages: [] },
        });
      })(userChat);
      promises.push(promise);
      if (promises.length >= 20) {
        await Promise.all(promises);
        promises = [];
      }
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  } catch (error) {
    console.log("Error migrating messages:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function fixEmptyParts() {
  try {
    const chatMessages = await prisma.chatMessage.findMany({
      where: {
        parts: { equals: [] },
      },
    });
    console.log(`${chatMessages.length} chat messages`);
    let promises = [];
    for (const { id, content } of chatMessages) {
      const promise = (async ({ id, content }) => {
        console.log(id);
        await prisma.chatMessage.update({
          where: { id },
          data: {
            parts: [{ type: "text", text: content }],
          },
        });
      })({ id, content });
      promises.push(promise);
      if (promises.length >= 50) {
        await Promise.all(promises);
        promises = [];
      }
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  } catch (error) {
    console.log("Error fix empty parts:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function fixPaymentParts() {
  try {
    const chatMessages = await prisma.chatMessage.findMany({
      where: {
        content: { contains: "免费研究额度已经用完，不如请一杯咖啡再做一份研究？" },
      },
    });
    console.log(`${chatMessages.length} chat messages`);
    for (const message of chatMessages) {
      const parts = message.parts.filter((part) => {
        if (part.type === "text") {
          return !part.text.includes("免费研究额度已经用完，不如请一杯咖啡再做一份研究？");
        } else if (part.type === "tool-invocation") {
          return !part.toolInvocation.toolName === "requestPayment";
        }
      });
      console.log(parts);
      if (parts.length) {
        await prisma.chatMessage.update({
          where: { id: message.id },
          data: {
            parts,
            content: message.content
              .replace("免费研究额度已经用完，不如请一杯咖啡再做一份研究？", "")
              .trim(),
          },
        });
      } else {
        await prisma.chatMessage.delete({
          where: { id: message.id },
        });
      }
    }
  } catch (error) {
    console.log("Error fix payment parts:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  // 先 git commit reset --hard 207f8752d4c92097f4a2afaafc732bc1d1a85a1f 执行下面两个，执行前运行 npx prisma generate
  // await migrateUserChatMessages();
  // await migrateInterviewChatMessages();
  // 在 git merge main 到最新分支执行下面两个，执行前运行 npx prisma generate
  // await fixEmptyParts();
  // await fixPaymentParts();
}

await main();
