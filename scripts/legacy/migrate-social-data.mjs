import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateSocialData() {
  try {
    const chatMessages = await prisma.ChatMessage.findMany({
      where: {
        userChat: {
          kind: "scout",
        },
        role: "assistant",
        parts: {
          not: {
            equal: [],
          },
        },
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    console.log(`${chatMessages.length} chat messages`);
    let promises = [];
    for (const { id } of chatMessages) {
      const promise = (async () => {
        const message = await prisma.ChatMessage.findUniqueOrThrow({
          where: { id },
        });
        const parts = message.parts;
        let update = false;
        for (const part of parts) {
          if (part.type === "tool-invocation") {
            const toolInvocation = part.toolInvocation;
            const items =
              toolInvocation.result?.posts ||
              toolInvocation.result?.notes ||
              toolInvocation.result?.comments;
            if (items) {
              for (const item of items) {
                if (item.user?.images) {
                  console.log(id, toolInvocation.toolName);
                  item.user.image = item.user.images;
                  delete item.user.images;
                  update = true;
                }
              }
            }
          }
        }
        if (update) {
          await prisma.ChatMessage.update({
            where: { id },
            data: { parts },
          });
        }
      })(id);
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
    console.log("Error migrating social data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await migrateSocialData();
}

await main();
