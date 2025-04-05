import { PrismaClient } from "@prisma/client";

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
    });
    for (const chat of userChats) {
      const token = generateToken();
      await prisma.userChat.update({
        where: { id: chat.id },
        data: { token },
      });
    }
  } catch (error) {
    console.log("Error setting user chat token:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行导入
setUserChatToken();
