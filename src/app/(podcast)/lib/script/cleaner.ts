import "server-only";

/**
 * Cleans a single line of podcast script by removing markdown and stage directions
 *
 * Removes:
 * - Markdown headers (lines starting with #)
 * - Markdown bold/italic markers (*)
 * - Host markers (【...】)
 *
 * @param line - A single line from the podcast script
 * @returns Cleaned text or null if the line should be skipped
 */
export function cleanPodcastScriptLine(line: string): string | null {
  const trimmed = line.trim();
  
  // Skip markdown headers
  if (trimmed.startsWith("#")) {
    return null;
  }
  
  return trimmed
    .replace(/^#.*$/gm, "") // Remove markdown headers
    .replace(/\*/g, "") // Remove markdown bold/italic markers
    .replace(/【[^】]*】/g, "") // Remove host markers
    .trim();
}
