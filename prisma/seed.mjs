import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting to seed products...");

  const products = [
    {
      name: "TEST_A",
      price: 0.01,
      description: "atypica.LLM 开发测试",
    },
    {
      name: "TEST_B",
      price: 0.1,
      description: "atypica.LLM 开发测试",
    },
    {
      name: "POINTS100_A",
      price: 7.5,
      description: "请 atypica.LLM 一杯挂耳咖啡",
    },
    {
      name: "POINTS100_B",
      price: 15,
      description: "请 atypica.LLM 一杯 Manner 咖啡",
    },
    {
      name: "POINTS100_C",
      price: 30,
      description: "请 atypica.LLM 一杯星巴克咖啡",
    },
    {
      name: "POINTS100_D",
      price: 45,
      description: "请 atypica.LLM 一杯小蓝瓶咖啡",
    },
  ];

  // Clear existing products first to avoid duplicates
  await prisma.product.deleteMany();

  // Create products
  for (const product of products) {
    const createdProduct = await prisma.product.create({
      data: product,
    });
    console.log(`Created product: ${createdProduct.name}`);
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
