import "server-only";

/**
 * Cleans a single line of podcast script by removing markdown and stage directions
 *
 * Removes:
 * - Markdown headers (lines starting with #)
 * - Markdown bold/italic markers (*)
 * - Host markers (【...】)
 * 
 * Additionally:
 * - If the line starts with **something**, replaces that with 【something】
 *
 * @param line - A single line from the podcast script
 * @returns Cleaned text or null if the line should be skipped
 */
export function cleanPodcastScriptLine(line: string): string | null {
  let trimmed = line.trim();

  // Skip markdown headers
  if (trimmed.startsWith("#")) {
    return null;
  }

  // If the line starts with **something**, replace it with 【something】 (only at the start)
  trimmed = trimmed.replace(/^\*\*([^*]+)\*\*/, "");
  // If the line starts with ANY length of punctuation, remove it
  // eg. ：[]\\]，。。，%&#@*¥一家公司两年内要投入5000万 -> 一家公司两年内要投入5000万，把销售额从1个亿做到2.5个亿
  trimmed = trimmed.replace(
    /^[\p{P}\p{S}\p{Zs}\[\]、，。？！：；“”‘’【】…（）—《》·￥%\s\\@#&*¥]+/u,
    ""
  );

  return trimmed
    .replace(/^#.*$/gm, "") // Remove markdown headers
    .replace(/\*/g, "") // Remove markdown bold/italic markers
    .replace(/【[^】]*】/g, "") // Remove host markers
    .trim();
}