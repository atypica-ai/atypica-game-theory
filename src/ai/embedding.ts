export async function createTextEmbedding(
  text: string,
  task: "retrieval.query" | "retrieval.passage",
) {
  try {
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
        // dimensions: 1024  // 默认是 1024
      }),
    });
    if (!res.ok) {
      const errorMsg = await res.text();
      throw new Error(`Failed to create embeddings: [${res.status}] ${errorMsg}`);
    }
    const { data } = await res.json();
    return data[0].embedding;
  } catch (error) {
    console.error("Error creating embedding:", error);
    throw error;
  }
}
