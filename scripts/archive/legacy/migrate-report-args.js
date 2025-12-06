const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

async function migrateReportArgs() {
  try {
    const studyUserChats = await prisma.userChat.findMany({
      where: { kind: "study" },
      select: { id: true },
    });
    console.log(`${studyUserChats.length} study user chats`);
    for (const { id: chatId } of studyUserChats) {
      let updated = false;
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
          if (toolInvocation.toolName === "generateReport" && !toolInvocation.args.reportToken) {
            if (toolInvocation.state === "result") {
              console.log("old", toolInvocation);
              const report = await prisma.analystReport.findUnique({
                where: { id: toolInvocation.result.reportId },
              });
              if (report) {
                toolInvocation.args.reportToken = report.token;
                delete toolInvocation.result.analystId;
                delete toolInvocation.result.reportId;
              } else {
                console.log("report not found", toolInvocation.result.reportId);
              }
              console.log("new", toolInvocation);
            } else {
              console.log("old", toolInvocation);
              // 如果 report 任务没完成，给这个任务关联最新的一个 report
              const report = await prisma.analystReport.findFirst({
                where: { analystId: toolInvocation.args.analystId },
                orderBy: { id: "desc" },
              });
              if (report) {
                toolInvocation.args.reportToken = report.token;
              } else {
                console.log("report not found for analyst", toolInvocation.args.analystId);
              }
              console.log("new", toolInvocation);
            }
            updated = true;
          }
          if (
            toolInvocation.toolName === "generateReport" &&
            toolInvocation.args.reportToken &&
            toolInvocation.state === "result" &&
            !toolInvocation.result.reportToken
          ) {
            console.log("old", toolInvocation);
            toolInvocation.result.reportToken = toolInvocation.args.reportToken;
            console.log("new", toolInvocation);
            updated = true;
          }
          parts.push({ ...part, toolInvocation });
        }
        messages.push({ ...message, parts });
      }
      if (updated) {
        await prisma.userChat.update({
          where: { id: chat.id },
          data: { messages },
        });
      }
    }
  } catch (error) {
    console.log("Error migrating messages:", error);
  } finally {
    await prisma.$disconnect();
  }
}

await migrateReportArgs();
