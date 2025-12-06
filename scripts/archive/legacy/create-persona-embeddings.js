const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

async function embeddingRequest(text, task) {
  const res = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model: "jina-embeddings-v3",
      task: task,
      truncate: true,
      input: [text],
    }),
  });
  if (res.status === 429) {
    const seconds = 10 + Math.floor(Math.random() * 50);
    console.log(`Rate limit exceeded, wait for ${seconds} seconds`);
    return await new Promise((resolve, reject) => {
      setTimeout(() => {
        embeddingRequest(text, task)
          .then((embedding) => resolve(embedding))
          .catch((error) => reject(error));
      }, seconds * 1000);
    });
  }
  if (!res.ok) {
    const errorMsg = await res.text();
    throw new Error(
      `Failed to create embeddings for "${text.slice(0, 20)}": [${res.status}] ${errorMsg}`,
    );
  }
  const { data } = await res.json();
  const embedding = data[0].embedding;
  return embedding;
}

async function createEmbedding() {
  // let skip = 0; // 不需要 skip，因为上一轮处理好，embedding 就不是 null 了，所以每次取 30 条 embedding 为空的就行，其实
  const take = 30;
  while (true) {
    const personas = await prisma.$queryRaw`
      SELECT id, name, tags, prompt
      FROM "Persona"
      WHERE "embedding" IS NULL
      ORDER BY "id" DESC
      LIMIT ${take}
    `;
    if (!personas.length) break;
    const promises = [];
    for (const persona of personas) {
      const promise = new Promise(async (resolve, reject) => {
        try {
          // const text = persona.name + " " + persona.tags.join(" ");
          // 如果 prompt 长度 < 300，是质量不好的 persona，要跳过。embedding = null, locale = null, 确保不会被搜索出来
          const text = persona.prompt;
          const embedding = await embeddingRequest(text, "retrieval.passage");
          await prisma.$executeRaw`
            UPDATE "Persona"
            SET "embedding" = ${JSON.stringify(embedding)}::halfvec
            WHERE "id" = ${persona.id}
          `;
          console.log(`Updated embedding for persona ${persona.id}`);
          resolve(null);
        } catch (error) {
          console.log(`Failed to create embeddings persona ${persona.id}: ${error.message}`);
          // reject(error);
          resolve(null); // 出错的直接跳过
        }
      });
      promises.push(promise);
    }
    await Promise.all(promises);
  }
}

async function searchPersona(keyword) {
  const embedding = await embeddingRequest(keyword, "retrieval.query");
  const result = await prisma.$queryRaw`
    SELECT
      id,
      name,
      "embedding" <=> ${JSON.stringify(embedding)}::halfvec AS distance
    FROM "Persona"
    WHERE embedding IS NOT NULL AND ("embedding" <=> ${JSON.stringify(embedding)}::halfvec) < 0.9
    ORDER BY distance ASC
    LIMIT 5
  `;
  // console.log(result);
  for (const persona of result) {
    console.log(persona.id, persona.name, persona.distance);
  }
}

// createEmbedding();
searchPersona("星球大战爱好者");
