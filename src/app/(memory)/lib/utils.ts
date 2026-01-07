import { Logger } from "pino";
const MEMORY_THRESHOLD = 8000;
/**
 * Approximate the number of LLM tokens in the input string.
 * This is NOT exact, but mimics LLM token counting by splitting on whitespace
 * and common punctuation; words and punctuation are basic proxies for tokens.
 */
export function countMemoryLength(memory: string): number {
  // Split on whitespace and punctuation, filter out empty strings.
  return memory.split(/[\s.,!?;:"'(){}\[\]-]+/).filter((token) => token.length > 0).length;
}

export function isMemoryThresholdMet(memory: string, logger: Logger) {
  const memoryLength = countMemoryLength(memory);
  const isMet = memoryLength > MEMORY_THRESHOLD;
  logger.info({
    msg: "Checking if memory threshold is met",
    memoryLength,
    threshold: MEMORY_THRESHOLD,
    isMet,
  });
  return isMet;
}
