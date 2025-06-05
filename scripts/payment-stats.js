const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

const dateBefore = new Date("2025-06-01T00:00:00+08:00");
const pad12 = (n) => n.toLocaleString().padStart(12, " ");
const fdate = (d) =>
  new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeZone: "Asia/Shanghai",
  })
    .format(d)
    .padEnd(10, " ");

async function getPaidUsers() {
  const users = await prisma.user.findMany({
    where: {
      paymentRecords: {
        some: {
          status: "succeeded",
          paidAt: {
            lt: dateBefore,
          },
        },
      },
    },
    // include: {
    //   paymentRecords: {
    //     where: { status: "succeeded" },
    //     include: { paymentLines: { include: { product: true } } },
    //   },
    // },
  });
  return users;
}

async function main() {
  const users = await getPaidUsers();
  console.log(`Order,PaymentMethod,Amount,Receibed,Used,Payable,Plan,Date,Email`);
  for (const user of users) {
    const tokensLogs = await prisma.userTokensLog.findMany({
      where: {
        userId: user.id,
        createdAt: {
          lt: dateBefore,
        },
      },
      orderBy: { id: "asc" },
    });
    const giftedTokensTotal = tokensLogs
      .filter((log) => (log.verb === "gift") | (log.verb === "signup"))
      .reduce((acc, log) => acc + log.value, 0);
    const consumedTokensTotal = tokensLogs
      .filter((log) => log.verb === "consume")
      .reduce((acc, log) => acc + log.value, 0);
    let payable = giftedTokensTotal + consumedTokensTotal;
    console.log(`Free,,,${giftedTokensTotal},${consumedTokensTotal},${payable},,,${user.email}`);
    for (const log of tokensLogs.filter((log) => log.verb === "subscription")) {
      if (log.resourceType !== "PaymentRecord") {
        throw new Error("Something went wrong");
      }
      const paymentRecord = await prisma.paymentRecord.findUniqueOrThrow({
        where: { id: log.resourceId },
      });
      const used = Math.min(0, Math.max(payable, -log.value));
      payable = payable - used;
      console.log(
        `${paymentRecord.orderNo},${paymentRecord.paymentMethod},${paymentRecord.amount},${log.value},${used},${payable},Pro,${fdate(paymentRecord.paidAt)},${user.email}`,
      );
    }
    for (const log of tokensLogs.filter((log) => log.verb === "recharge")) {
      if (log.resourceType !== "PaymentRecord") {
        throw new Error("Something went wrong");
      }
      const paymentRecord = await prisma.paymentRecord.findUniqueOrThrow({
        where: { id: log.resourceId },
      });
      const used = Math.min(0, Math.max(payable, -log.value));
      payable = payable - used;
      console.log(
        `${paymentRecord.orderNo},${paymentRecord.paymentMethod},${paymentRecord.amount},${log.value},${used},${payable},Recharge,${fdate(paymentRecord.paidAt)},${user.email}`,
      );
    }
  }
}

main();
// node scripts/payment-stats.js > payment-stats.csv
