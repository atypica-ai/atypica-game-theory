async function main() {
  const { prisma } = await import("@/prisma/prisma");
  const personas = await prisma.persona.findMany({
    where: { id: { gte: 3151, lte: 3160 } },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
  console.log(JSON.stringify(personas, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
