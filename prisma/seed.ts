import "../scripts/mock-server-only";

import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());

  const { prisma } = require("@/prisma/prisma");

  console.log("Starting to seed products...");
  const products = [
    {
      name: "TOKENS1M",
      price: 100,
      currency: "CNY",
      description: "atypica.AI 充值 100 万 Tokens",
      stripePriceId: "price_1ShoCHGU0jUFYcrNhdxLaIHw", // 测试环境 price_1Sho4vGU0jUFYcrN9ZlHcF2a
    },
    {
      name: "TOKENS1M",
      price: 16,
      currency: "USD",
      description: "atypica.AI recharge 1 million Tokens",
      stripePriceId: "price_1ShoCHGU0jUFYcrNhdxLaIHw", // 测试环境 price_1Sho4vGU0jUFYcrN9ZlHcF2a
    },
    {
      name: "PRO1MONTH",
      price: 129,
      currency: "CNY",
      description: "atypica.AI Pro 会员 1 个月",
      stripePriceId: "price_1ShpScGU0jUFYcrNoHr5JuKF", // 测试环境 price_1RbQuJGU0jUFYcrNyw8cxtEi
    },
    {
      name: "PRO1MONTH",
      price: 20,
      currency: "USD",
      description: "atypica.AI Pro membership for 1 month",
      stripePriceId: "price_1ShpScGU0jUFYcrNoHr5JuKF", // 测试环境 price_1RbQuJGU0jUFYcrNyw8cxtEi
    },
    {
      name: "MAX1MONTH",
      price: 329,
      currency: "CNY",
      description: "atypica.AI Max 会员 1 个月",
      stripePriceId: "price_1ShppKGU0jUFYcrN5K9V1Meh", // 测试环境 price_1RbZ6RGU0jUFYcrNBY6pI6kh
    },
    {
      name: "MAX1MONTH",
      price: 50,
      currency: "USD",
      description: "atypica.AI Max membership for 1 month",
      stripePriceId: "price_1ShppKGU0jUFYcrN5K9V1Meh", // 测试环境 price_1RbZ6RGU0jUFYcrNBY6pI6kh
    },
    {
      name: "SUPER1MONTH",
      price: 1299,
      currency: "CNY",
      description: "atypica.AI Super 会员 1 个月",
      stripePriceId: "price_1ShprwGU0jUFYcrNFtrBYeLz", // 测试环境 price_1SSfJbGU0jUFYcrNsgGGqgyR
    },
    {
      name: "SUPER1MONTH",
      price: 200,
      currency: "USD",
      description: "atypica.AI Super membership for 1 month",
      stripePriceId: "price_1ShprwGU0jUFYcrNFtrBYeLz", // 测试环境 price_1SSfJbGU0jUFYcrNsgGGqgyR
    },
    {
      name: "TEAMSEAT1MONTH",
      price: 329,
      currency: "CNY",
      description: "atypica.AI 团队席位 1 个月",
      stripePriceId: "price_1ShpxHGU0jUFYcrNknazRbIv", // 测试环境 price_1RvJllGU0jUFYcrNgxki8pwe
    },
    {
      name: "TEAMSEAT1MONTH",
      price: 50,
      currency: "USD",
      description: "atypica.AI team seat for 1 month",
      stripePriceId: "price_1ShpxHGU0jUFYcrNknazRbIv", // 测试环境 price_1RvJllGU0jUFYcrNgxki8pwe
    },
    {
      name: "SUPERTEAMSEAT1MONTH",
      price: 1299,
      currency: "CNY",
      description: "atypica.AI Super 团队席位 1 个月",
      stripePriceId: "price_1ShpzDGU0jUFYcrNGLjo5KP4", // 测试环境 price_1SSfLGGU0jUFYcrN3zzP6ZbJ
    },
    {
      name: "SUPERTEAMSEAT1MONTH",
      price: 200,
      currency: "USD",
      description: "atypica.AI Super team seat for 1 month",
      stripePriceId: "price_1ShpzDGU0jUFYcrNGLjo5KP4", // 测试环境 price_1SSfLGGU0jUFYcrN3zzP6ZbJ
    },
  ];
  // Create products
  for (const { name, price, currency, description, stripePriceId } of products) {
    try {
      const createdProduct = await prisma.product.upsert({
        where: {
          name_currency: {
            name: name,
            currency: currency,
          },
        },
        update: { name, price, currency, description, stripePriceId, extra: { stripePriceId } },
        create: { name, price, currency, description, stripePriceId, extra: { stripePriceId } },
      });
      console.log(`Upserted product: ${createdProduct.name}`);
    } catch (error) {
      console.error(`Failed to upsert product: ${error.message}`);
    }
  }
  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    // await prisma.$disconnect();
  });
