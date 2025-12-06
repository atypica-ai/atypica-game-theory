const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    const tokensAccount = await prisma.tokensAccount.findMany({
      where: {
        monthlyResetAt: {
          not: null,
        },
      },
    });
    for (const { id: tokensAccountId, userId, monthlyResetAt } of tokensAccount) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
        },
        orderBy: {
          endsAt: "desc",
        },
      });
      if (subscription.endsAt.valueOf() === monthlyResetAt.valueOf()) {
        await prisma.tokensAccount.update({
          where: {
            id: tokensAccountId,
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
