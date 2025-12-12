import "server-only";
import { cleanPodcastScriptLine } from "./cleaner";

/**
 * Parse markdown podcast script into plain text
 * Removes host markers and combines all dialogue into a single text
 *
 * @param script - The podcast script in markdown format
 * @returns Plain text with all dialogue combined
 */
export function parseScriptToText(script: string): string {
  const lines = script.split("\n").filter((line) => line.trim());
  const textParts: string[] = [];

  for (const line of lines) {
    const cleanedText = cleanPodcastScriptLine(line);
    if (cleanedText && cleanedText.length > 0) {
      textParts.push(cleanedText);
    }
  }

  return textParts.join(" ");
}

/**
 * Parse markdown podcast script into lines with cleaned text
 *
 * @param script - The podcast script in markdown format
 * @returns Array of cleaned text lines (empty lines filtered out)
 */
export function parseScriptToLines(script: string): string[] {
  const lines = script.split("\n").filter((line) => line.trim());
  const cleanedLines: string[] = [];

  for (const line of lines) {
    const cleanedText = cleanPodcastScriptLine(line);
    if (cleanedText && cleanedText.length > 0) {
      cleanedLines.push(cleanedText);
    }
  }

  return cleanedLines;
}
