const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

async function createProducts() {
  console.log("Starting to seed products...");
  const products = [
    {
      name: "TOKENS1M",
      price: 100,
      currency: "CNY",
      description: "atypica.AI 充值 100 万 Tokens",
    },
    {
      name: "PRO1MONTH",
      price: 159,
      currency: "CNY",
      description: "atypica.AI Pro 会员 1 个月",
    },
    {
      name: "MAX1MONTH",
      price: 399,
      currency: "CNY",
      description: "atypica.AI Max 会员 1 个月",
    },
    {
      name: "TOKENS1M",
      price: 16,
      currency: "USD",
      description: "atypica.AI recharge 1 million Tokens",
      extra: { price_id: "price_1RFNxFGU0jUFYcrNgjrI3a7K" }, // 测试环境 price_1RFpy7GU0jUFYcrNG7fNLoDv
    },
    {
      name: "PRO1MONTH",
      price: 20,
      currency: "USD",
      description: "atypica.AI Pro membership for 1 month",
      extra: { price_id: "price_1RRtJQGU0jUFYcrN9ib9SVl7" }, // 测试环境 price_1RRIwUGU0jUFYcrNJL8ZwX3L
    },
    {
      name: "MAX1MONTH",
      price: 50,
      currency: "USD",
      description: "atypica.AI Max membership for 1 month",
      extra: { price_id: "price_1RYI8TGU0jUFYcrNvctz9kpB" }, // 测试环境 price_1RYI0FGU0jUFYcrNc8ul4Qd6
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

async function main() {
  await createProducts();
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
