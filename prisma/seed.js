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
      extra: { price_id: "price_1RbZh6GU0jUFYcrNqYSrWXfG" }, // 测试环境 price_1RbZ7CGU0jUFYcrNOrdZfZkP
    },
    {
      name: "PRO1MONTH",
      price: 129,
      currency: "CNY",
      description: "atypica.AI Pro 会员 1 个月",
      extra: { price_id: "price_1RbZj5GU0jUFYcrN9K2QZFDN" }, // 测试环境 price_1RbQuJGU0jUFYcrNyw8cxtEi
    },
    {
      name: "MAX1MONTH",
      price: 329,
      currency: "CNY",
      description: "atypica.AI Max 会员 1 个月",
      extra: { price_id: "price_1RbZkAGU0jUFYcrNGukQQlO3" }, // 测试环境 price_1RbZ6RGU0jUFYcrNBY6pI6kh
    },
    {
      name: "TOKENS1M",
      price: 16,
      currency: "USD",
      description: "atypica.AI recharge 1 million Tokens",
      extra: { price_id: "price_1RbZh6GU0jUFYcrNqYSrWXfG" }, // 测试环境 price_1RbZ7CGU0jUFYcrNOrdZfZkP
    },
    {
      name: "PRO1MONTH",
      price: 20,
      currency: "USD",
      description: "atypica.AI Pro membership for 1 month",
      extra: { price_id: "price_1RbZj5GU0jUFYcrN9K2QZFDN" }, // 测试环境 price_1RbQuJGU0jUFYcrNyw8cxtEi
    },
    {
      name: "MAX1MONTH",
      price: 50,
      currency: "USD",
      description: "atypica.AI Max membership for 1 month",
      extra: { price_id: "price_1RbZkAGU0jUFYcrNGukQQlO3" }, // 测试环境 price_1RbZ6RGU0jUFYcrNBY6pI6kh
    },
    {
      name: "TEAMSEAT1M",
      price: 329,
      currency: "CNY",
      description: "atypica.AI 团队席位 1 个月",
      extra: {},
    },
    {
      name: "TEAMSEAT1M",
      price: 50,
      currency: "USD",
      description: "atypica.AI team seat for 1 month",
      extra: {},
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
