import "server-only";

/**
 * Read file content as text
 * For now, this is a simple implementation that handles common text-based formats
 * TODO: Add proper PDF, DOCX, and other binary format parsers
 */
export async function readFileContentAsText({
  buffer,
  mimeType,
  filename,
}: {
  buffer: ArrayBuffer;
  mimeType: string;
  filename: string;
}): Promise<string> {
  // Handle text-based files
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/javascript" ||
    mimeType === "application/typescript"
  ) {
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(buffer);
  }

  // Handle markdown
  if (filename.endsWith(".md") || filename.endsWith(".markdown")) {
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(buffer);
  }

  // For binary formats (PDF, DOCX, etc.), we'll need specialized parsers
  // For now, throw an error to indicate unsupported format
  throw new Error(
    `Unsupported file format: ${mimeType}. Please use text-based files (.txt, .md, .json, etc.) for now. Binary format support (PDF, DOCX) coming soon.`
  );
}
