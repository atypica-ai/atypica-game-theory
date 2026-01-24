/**
 * Simple server-side URL parameter parser
 * Just extracts values from URL, doesn't handle defaults or complex logic
 */
export function parseServerSearchParams(searchParams: {
  [key: string]: string | string[] | undefined;
}): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};

  for (const [key, rawValue] of Object.entries(searchParams)) {
    if (rawValue !== undefined) {
      const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

      // Try to parse as number if it looks like a number
      if (value && /^\d+$/.test(value)) {
        result[key] = parseInt(value, 10);
      } else if (value === "true") {
        result[key] = true;
      } else if (value === "false") {
        result[key] = false;
      } else if (value) {
        result[key] = value;
      }
    }
  }

  return result;
}
