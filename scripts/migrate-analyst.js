const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

async function setUserIdOnAnalyst() {
  while (true) {
    const analysts = await prisma.analyst.findMany({
      where: { userId: null },
      select: {
        id: true,
        studyUserChat: {
          select: { userId: true },
        },
        userAnalysts: {
          select: { userId: true },
        },
      },
      take: 100,
    });
    if (!analysts.length) break;
    const promises = [];
    for (const analyst of analysts) {
      const promise = new Promise(async (resolve, reject) => {
        try {
          const userId = analyst.userAnalysts[0]?.userId || analyst.studyUserChat?.userId;
          if (!userId) {
            throw new Error("userId is null");
          }
          await prisma.analyst.update({
            where: { id: analyst.id, userId: null },
            data: { userId },
          });
          console.log(`Analyst ${analyst.id} userId set successfully`);
          resolve(null);
        } catch (error) {
          console.log(`Error setting userId on analyst ${analyst.id}: ${error.message}`);
          reject(null);
        }
      });
      promises.push(promise);
    }
    await Promise.all(promises);
  }
}

async function createAnalystForStudyUserChat() {
  while (true) {
    const studyUserChats = await prisma.userChat.findMany({
      where: { analyst: null, kind: "study" },
      take: 100,
    });
    if (!studyUserChats.length) break;
    const promises = [];
    for (const studyUserChat of studyUserChats) {
      const promise = new Promise(async (resolve, reject) => {
        try {
          const analyst = await prisma.analyst.create({
            data: {
              userId: studyUserChat.userId,
              studyUserChatId: studyUserChat.id,
              brief: "",
              role: "",
              topic: "",
              studySummary: "",
            },
          });
          console.log(
            `Analyst ${analyst.id} created successfully for studyUserChat ${studyUserChat.id}`,
          );
          resolve(null);
        } catch (error) {
          console.log(
            `Error creating analyst for studyUserChat ${studyUserChat.id}: ${error.message}`,
          );
          reject(null);
        }
      });
      promises.push(promise);
    }
    await Promise.all(promises);
  }
}

async function updateAnalystBrief() {
  while (true) {
    const studyUserChats = await prisma.userChat.findMany({
      where: {
        analyst: {
          brief: "",
        },
        kind: "study",
      },
      select: {
        id: true,
        userId: true,
        title: true,
        analyst: {
          select: { id: true },
        },
        messages: {
          orderBy: { id: "asc" },
          take: 1,
        },
      },
      take: 100,
    });
    if (!studyUserChats.length) break;
    const promises = [];
    for (const studyUserChat of studyUserChats) {
      const promise = new Promise(async (resolve, reject) => {
        try {
          const analyst = studyUserChat.analyst;
          if (!analyst) {
            throw new Error("Analyst not found");
          }
          const brief = studyUserChat.messages[0]?.parts[0]?.text || studyUserChat.title;
          await prisma.analyst.update({
            where: { id: analyst.id },
            data: { brief },
          });
          console.log(`Updated analyst brief for studyUserChat ${studyUserChat.id}`);
          resolve(null);
        } catch (error) {
          console.log(
            `Error updating analyst brief for studyUserChat ${studyUserChat.id}: ${error.message}`,
          );
          reject(null);
        }
      });
      promises.push(promise);
    }
    await Promise.all(promises);
  }
}

setUserIdOnAnalyst();
createAnalystForStudyUserChat();
updateAnalystBrief();
