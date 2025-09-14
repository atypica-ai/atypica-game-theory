const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    const subscriptions = await prisma.subscription.findMany({
      orderBy: {
        endsAt: "desc",
      },
    });
    for (const subscription of subscriptions) {
      const stripeCustomerId = subscription.extra.invoice?.customer;
      if (!stripeCustomerId) {
        continue;
      }
      const user = await prisma.user.findUnique({
        where: { id: subscription.userId },
      });
      if (!user.extra.stripeCustomerId) {
        console.log(subscription.userId.toString().padStart(7), stripeCustomerId, "🔗 link");
        await prisma.user.update({
          where: { id: subscription.userId },
          data: {
            extra: { ...user.extra, stripeCustomerId },
          },
        });
      } else {
        console.log(subscription.userId.toString().padStart(7), stripeCustomerId, "✅ passed");
      }
    }
    const paymentRecords = await prisma.paymentRecord.findMany({
      where: {
        status: "succeeded",
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    for (const paymentRecord of paymentRecords) {
      // ⚠️ TODO: charge.invoice is moved to stripeInvoice field
      const stripeCustomerId = paymentRecord.charge.invoice?.customer;
      if (!stripeCustomerId) {
        continue;
      }
      const user = await prisma.user.findUnique({
        where: { id: paymentRecord.userId },
      });
      if (!user.extra.stripeCustomerId) {
        console.log(paymentRecord.userId.toString().padStart(7), stripeCustomerId, "🔗 link");
        await prisma.user.update({
          where: { id: paymentRecord.userId },
          data: {
            extra: { ...user.extra, stripeCustomerId },
          },
        });
      } else {
        console.log(paymentRecord.userId.toString().padStart(7), stripeCustomerId, "✅ passed");
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
