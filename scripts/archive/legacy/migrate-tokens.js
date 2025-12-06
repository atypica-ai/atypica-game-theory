const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

async function migrateTokens() {
  try {
    const users = await prisma.user.findMany({
      // include: { tokensAccount: true },
    });
    console.log(`${users.length} users`);
    let promises = [];
    for (const user of users) {
      const promise = (async () => {
        const logs = await prisma.tokensLog.findMany({
          where: { userId: user.id },
        });
        for (const log of logs) {
          console.log(user.email, log.verb, log.value);
          let value = null;
          if (log.verb === "recharge") {
            value = 1_000_000; // 奖励充值，每次充值按照 100W tokens 计算
          } else if (log.verb === "consume") {
            value = -500_000; // 历史每次消耗按照 50W tokens 计算
          } else if (log.verb === "signup") {
            value = 2_000_000; // 历史注册赠送 200W tokens
          } else if (log.verb === "gift") {
            if (log.value <= 10000) {
              value = (log.value / 100) * 500_000; // 每赠送一点 = 50W tokens
            }
          }
          if (value !== null) {
            await prisma.tokensLog.update({
              where: { id: log.id },
              data: { value: value },
            });
          }
        }
        const result = await prisma.tokensLog.aggregate({
          where: { userId: user.id },
          _sum: { value: true },
        });
        const totalTokens = result._sum.value || 0;
        // Update the tokensAccount total
        await prisma.tokensAccount.update({
          where: { userId: user.id },
          data: { balance: totalTokens },
        });
        console.log(user.email, totalTokens);
      })(user);
      promises.push(promise);
      if (promises.length >= 10) {
        await Promise.all(promises);
        promises = [];
      }
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  } catch (error) {
    console.log("Error migrating tokens:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await migrateTokens();
}

await main();
