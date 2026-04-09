import "dotenv/config";
import "./mock-server-only";
import { llm, LLMModelName } from "../src/ai/provider";
import { generateText } from "ai";

const MODELS_TO_TEST: LLMModelName[] = [
  "gpt-5-mini",
  "claude-sonnet-4-5",
  "gemini-3-flash-preview",
];

async function testModel(modelName: LLMModelName) {
  const start = Date.now();
  try {
    const { text, usage } = await generateText({
      model: llm(modelName),
      prompt: "Say hello in one sentence. Be brief.",
      maxTokens: 50,
    });
    const elapsed = Date.now() - start;
    console.log(`✓ ${modelName} (${elapsed}ms) — ${text.trim()}`);
    if (usage) {
      console.log(`  tokens: prompt=${usage.promptTokens} completion=${usage.completionTokens}`);
    }
  } catch (err) {
    const elapsed = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${modelName} (${elapsed}ms) — ${msg}`);
  }
}

async function main() {
  console.log("Testing PPIO provider with 3 major model families...\n");
  for (const model of MODELS_TO_TEST) {
    await testModel(model);
    console.log();
  }
}

main();
