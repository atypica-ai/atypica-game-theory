const { PrismaClient } = require("../src/prisma/client");
const { createAmazonBedrock } = require("@ai-sdk/amazon-bedrock");
const { generateText } = require("ai");

const prisma = new PrismaClient();

const bedrock = createAmazonBedrock({
  region: process.env.AWS_BEDROCK_REGION,
  accessKeyId: process.env.AWS_BEDROCK_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY,
});

async function single(analyst) {
  console.log(`Processing analyst ${analyst.id}...`);

  const result = await generateText({
    model: bedrock("us.anthropic.claude-3-7-sonnet-20250219-v1:0"),
    prompt: `You are a professional research classification expert. Based on the analyst's role and research topic, determine what type of research this is.

Research type definitions:
- testing: Compare options, validate hypotheses, measure effectiveness, and test user reactions or preferences
- insights: Understand current situations, discover problems, and analyze behaviors
- creation: Generate new ideas, design innovative solutions, and creative exploration
- planning: Develop frameworks, design solution architectures, and create structured implementation plans
- misc: Comprehensive or hybrid research that doesn't fully fit the other categories

Analyst information:
Role: ${analyst.role || "Not set"}
Research Topic: ${analyst.topic || "Not set"}

Requirements:
1. Carefully analyze the core objectives and content of the research topic
2. Return only one word as the result: testing, insights, creation, planning, or misc
3. Do not include any explanations or other text`,
    maxTokens: 50,
  });

  let kind = result.text.trim().toLowerCase();

  // 验证返回的类型是否有效
  const validKinds = ["testing", "insights", "creation", "planning", "misc"];
  if (!validKinds.includes(kind)) {
    console.warn(`Invalid kind '${kind}' for analyst ${analyst.id}, using 'misc' as fallback`);
    kind = "misc";
  }

  // 更新数据库
  await prisma.analyst.update({
    where: { id: analyst.id },
    data: { kind },
  });

  console.log(`✓ Analyst ${analyst.id} classified as: ${kind}`);
}

async function main() {
  const analysts = await prisma.analyst.findMany({
    select: { id: true, role: true, topic: true },
    where: {
      // featuredStudy: {
      //   isNot: null,
      // },
      kind: null,
      topic: {
        not: "",
      },
    },
    orderBy: { id: "desc" },
  });
  console.log(`Found ${analysts.length} analysts without kind classification`);
  const promises = [];
  for (const analyst of analysts) {
    promises.push(single(analyst));
    if (promises.length >= 10) {
      await Promise.all(promises);
      promises.length = 0;
    }
  }
  await Promise.all(promises);
  console.log("All analysts processed successfully");
}

main()
  .catch((e) => {
    console.error("Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
