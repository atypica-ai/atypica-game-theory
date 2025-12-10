import { Logger } from "pino";

/**
 * Calculates the similarity ratio between two strings using Levenshtein distance
 * Returns a value between 0 and 1, where 1 means identical
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const maxLength = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLength;
}

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Normalizes text for comparison by removing extra whitespace
 */
function normalizeForComparison(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Detects and removes exact duplicate content from text
 *
 * This function checks if the text contains a complete duplication where
 * the second half is identical or highly similar to the first half.
 *
 * @param text - The text to check for duplicates
 * @param options - Configuration options
 * @param options.logger - Optional logger instance for logging detected duplicates
 * @param options.minLength - Minimum text length to check for duplicates (default: 100)
 * @param options.similarityThreshold - Similarity threshold for detecting duplicates (default: 0.95)
 * @returns The deduplicated text, or original text if no duplicate detected
 *
 * @example
 * ```typescript
 * const text = "Research content...Research content...";
 * const deduplicated = deduplicateText(text, { logger });
 * // Returns: "Research content..."
 * ```
 */
export function deduplicateText(
  text: string,
  options: {
    logger?: Logger;
    minLength?: number;
    similarityThreshold?: number;
  } = {},
): string {
  const { logger, minLength = 100, similarityThreshold = 0.95 } = options;

  // Early return for short texts
  if (!text || text.length < minLength) {
    return text;
  }

  const textLength = text.length;
  const halfLength = Math.floor(textLength / 2);

  // Check exact match first (most common case)
  const firstHalf = text.substring(0, halfLength);
  const secondHalf = text.substring(halfLength);

  // Exact match check
  if (firstHalf === secondHalf) {
    if (logger) {
      logger.warn(
        {
          originalLength: textLength,
          deduplicatedLength: halfLength,
          duplicateRatio: 0.5,
        },
        "Detected exact duplicate content in text",
      );
    }
    return firstHalf;
  }

  // Normalize and check similarity (handles whitespace differences)
  const normalizedFirst = normalizeForComparison(firstHalf);
  const normalizedSecond = normalizeForComparison(secondHalf);

  if (normalizedFirst === normalizedSecond) {
    if (logger) {
      logger.warn(
        {
          originalLength: textLength,
          deduplicatedLength: halfLength,
          duplicateRatio: 0.5,
          note: "Duplicate detected after whitespace normalization",
        },
        "Detected duplicate content in text (whitespace normalized)",
      );
    }
    return firstHalf.trim();
  }

  // Similarity check for near-duplicates
  const similarity = calculateSimilarity(normalizedFirst, normalizedSecond);
  if (similarity >= similarityThreshold) {
    if (logger) {
      logger.warn(
        {
          originalLength: textLength,
          deduplicatedLength: halfLength,
          similarity,
          similarityThreshold,
        },
        "Detected highly similar duplicate content in text",
      );
    }
    return firstHalf.trim();
  }

  // Check if text ends with the beginning (circular duplication)
  // This handles cases where duplication might not be exactly at the midpoint
  for (
    let checkLength = Math.floor(textLength * 0.4);
    checkLength <= Math.floor(textLength * 0.6);
    checkLength += 100
  ) {
    const start = text.substring(0, checkLength);
    const end = text.substring(textLength - checkLength);

    const normalizedStart = normalizeForComparison(start);
    const normalizedEnd = normalizeForComparison(end);

    if (normalizedStart === normalizedEnd) {
      const deduplicated = text.substring(0, textLength - checkLength).trim();
      if (logger) {
        logger.warn(
          {
            originalLength: textLength,
            deduplicatedLength: deduplicated.length,
            duplicateLength: checkLength,
            duplicateRatio: checkLength / textLength,
          },
          "Detected duplicate content at text boundaries",
        );
      }
      return deduplicated;
    }

    const boundarySimilarity = calculateSimilarity(normalizedStart, normalizedEnd);
    if (boundarySimilarity >= similarityThreshold) {
      const deduplicated = text.substring(0, textLength - checkLength).trim();
      if (logger) {
        logger.warn(
          {
            originalLength: textLength,
            deduplicatedLength: deduplicated.length,
            similarity: boundarySimilarity,
            similarityThreshold,
          },
          "Detected highly similar duplicate content at text boundaries",
        );
      }
      return deduplicated;
    }
  }

  // No duplicate detected
  return text;
}
