const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    const userTokens = await prisma.userTokens.findMany({
      where: {
        monthlyResetAt: {
          not: null,
        },
      },
    });
    for (const { id: userTokensId, userId, monthlyResetAt } of userTokens) {
      const subscription = await prisma.userSubscription.findFirst({
        where: {
          userId,
        },
        orderBy: {
          endsAt: "desc",
        },
      });
      if (subscription.endsAt.valueOf() === monthlyResetAt.valueOf()) {
        await prisma.userTokens.update({
          where: {
            id: userTokensId,
          },
          data: {
            extra: {
              activeUserSubscriptionId: subscription.id,
            },
          },
        });
      } else {
        console.log(subscription.endsAt, monthlyResetAt);
      }
    }
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
