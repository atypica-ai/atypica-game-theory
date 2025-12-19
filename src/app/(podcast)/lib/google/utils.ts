/**
 * Splits a string into chunks, each <= 3500 bytes (UTF-8), cutting at '\n' if possible,
 * otherwise at a period ('.'), otherwise at the max size.
 */

const MAX_CHUNK_SIZE = 3500;

/**
 * Gets the byte length of a string in UTF-8 encoding
 */
function getByteLength(str: string): number {
  return Buffer.byteLength(str, "utf8");
}

/**
 * Finds the best split position within the byte limit, following priority rules
 */
function findSplitPosition(text: string, maxBytes: number): number {
  let maxValidLength = 0;

  // Find the maximum character length that fits within byte limit
  for (let i = 0; i <= text.length; i++) {
    const substring = text.substring(0, i);
    if (getByteLength(substring) <= maxBytes) {
      maxValidLength = i;
    } else {
      break;
    }
  }

  if (maxValidLength === 0) {
    throw new Error("Cannot fit even a single character within byte limit");
  }

  const validText = text.substring(0, maxValidLength);

  // Priority 1: Try to split at newline
  const lastNewline = validText.lastIndexOf("\n");
  if (lastNewline !== -1) {
    return lastNewline + 1; // Include the newline in current chunk
  }

  // Priority 2: Try to split at period
  const lastPeriod = validText.lastIndexOf(".");
  if (lastPeriod !== -1) {
    return lastPeriod + 1; // Include the period in current chunk
  }

  // Priority 3: Hard cut at max valid length
  return maxValidLength;
}

/**
 * Splits a string into chunks based on byte size and splitting rules
 */
export function splitStringIntoChunks(
  input: string,
  maxChunkBytes: number = MAX_CHUNK_SIZE,
): string[] {
  if (!input || input.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let remainingText = input;

  while (remainingText.length > 0) {
    // If remaining text fits in one chunk, add it and finish
    if (getByteLength(remainingText) <= maxChunkBytes) {
      chunks.push(remainingText);
      break;
    }

    // Find the best split position
    const splitPos = findSplitPosition(remainingText, maxChunkBytes);

    // Extract the chunk and update remaining text
    const chunk = remainingText.substring(0, splitPos);
    chunks.push(chunk);
    remainingText = remainingText.substring(splitPos);
  }

  return chunks;
}
