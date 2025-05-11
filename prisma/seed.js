const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

async function createProducts() {
  console.log("Starting to seed products...");
  const products = [
    // { name: "TEST_A", price: 0.01, currency: "CNY", description: "atypica.AI 开发测试" },
    // { name: "TEST_B", price: 0.1, currency: "CNY", description: "atypica.AI 开发测试" },
    // { name: "POINTS100_A", price: 7.5, currency: "CNY", description: "请 atypica.AI 一杯挂耳咖啡" },
    // { name: "POINTS100_B", price: 15, currency: "CNY", description: "请 atypica.AI 一杯 Manner 咖啡" },
    // { name: "POINTS100_C", price: 30, currency: "CNY", description: "请 atypica.AI 一杯星巴克咖啡" },
    // { name: "POINTS100_D", price: 45, currency: "CNY", description: "请 atypica.AI 一杯小蓝瓶咖啡" },
    {
      name: "TOKENS1M",
      price: 100,
      currency: "CNY",
      description: "atypica.AI 充值 100 万 Tokens",
    },
    {
      name: "PRO1MONTH",
      price: 129,
      currency: "CNY",
      description: "atypica.AI Pro 会员 1 个月",
    },
    // { name: "TEST_A", price: 1, currency: "USD", description: "atypica.AI 开发测试", extra: { price_id: "price_1RBTWCGU0jUFYcrN9O7s7KJc" } },
    // { name: "TEST_B", price: 2, currency: "USD", description: "atypica.AI 开发测试", extra: { price_id: "price_1RBTWCGU0jUFYcrNt9sxHrmk" } },
    // { name: "POINTS100_A", price: 1, currency: "USD", description: "Buy atypica.AI a cup of drip coffee", extra: { price_id: "price_1RBgK5GU0jUFYcrN61vdZ8mG" } },
    // { name: "POINTS100_B", price: 2, currency: "USD", description: "Buy atypica.AI a Manner Coffee", extra: { price_id: "price_1RBgKKGU0jUFYcrNh2V99KRJ" } },
    // { name: "POINTS100_C", price: 4, currency: "USD", description: "Buy atypica.AI a Starbucks Coffee", extra: { price_id: "price_1RBgKYGU0jUFYcrNUO7spIAr" } },
    // { name: "POINTS100_D", price: 6, currency: "USD", description: "Buy atypica.AI a Blue Bottle Coffee", extra: { price_id: "price_1RBgKiGU0jUFYcrNLKj9lyeB" } },
    {
      name: "TOKENS1M",
      price: 16,
      currency: "USD",
      description: "atypica.AI recharge 1 million Tokens",
      extra: { price_id: "price_1RFNxFGU0jUFYcrNgjrI3a7K" },
    },
    {
      name: "PRO1MONTH",
      price: 20,
      currency: "USD",
      description: "atypica.AI Pro membership for 1 month",
      extra: { price_id: "price_1RG1ZkGU0jUFYcrNLp3ykPOm" },
    },
  ];
  // Create products
  for (const { name, price, currency, description, extra } of products) {
    try {
      const createdProduct = await prisma.product.upsert({
        where: {
          name_currency: {
            name: name,
            currency: currency,
          },
        },
        update: { name, price, currency, description, extra },
        create: { name, price, currency, description, extra },
      });
      console.log(`Upserted product: ${createdProduct.name}`);
    } catch (error) {
      console.error(`Failed to upsert product: ${error.message}`);
    }
  }
  console.log("Seeding completed successfully!");
}

async function initUserPoints() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId: user.id },
    });
    if (!userPoints) {
      await prisma.$transaction([
        prisma.userPoints.create({
          data: {
            userId: user.id,
            balance: 300,
          },
        }),
        prisma.userPointsLog.create({
          data: {
            userId: user.id,
            verb: "signup",
            points: 300,
          },
        }),
      ]);
    }
    console.log(`Initialized points for user: ${user.email}`);
  }
}

async function chargeHistoryChats() {
  const chats = await prisma.userChat.findMany({
    where: {
      kind: "study",
    },
    select: {
      id: true,
      userId: true,
    },
  });
  for (const chat of chats) {
    const log = await prisma.userPointsLog.findFirst({
      where: {
        // userId: chat.userId,
        verb: "consume",
        resourceType: "StudyUserChat",
        resourceId: chat.id,
      },
    });
    if (!log && chat.userId) {
      await prisma.userPointsLog.create({
        data: {
          userId: chat.userId,
          verb: "consume",
          resourceType: "StudyUserChat",
          resourceId: chat.id,
          points: 0,
        },
      });
      console.log(`Charge history chat: ${chat.id}`);
    }
  }
}

async function main() {
  await createProducts();
  // await initUserPoints();
  // await chargeHistoryChats(); // 这个不能重复调用，会让新的 chat 也关联一个 points 是 0 的 consume
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
