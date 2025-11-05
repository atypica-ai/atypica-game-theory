import { s3SignedUrl } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";

export async function parsePDFToText({
  name,
  objectUrl,
}: {
  name: string;
  objectUrl: string;
  mimeType: "application/pdf";
}) {
  const fileUrl = await s3SignedUrl(objectUrl);
  rootLogger.info({ msg: "Parsing file with Jina API", name });
  const extractedText = await parseWithJinaAPI(fileUrl);
  return extractedText;
}

export async function parseURLToText({ url }: { url: string }) {
  rootLogger.info({ msg: "Parsing URL with Jina API", url });
  const extractedText = await parseWithJinaAPI(url);
  return extractedText;
}

/**
 * Parse content (file or URL) using Jina API
 */
async function parseWithJinaAPI(url: string): Promise<string> {
  const response = await proxiedFetch("https://r.jina.ai/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    rootLogger.error({
      msg: "Jina API failed to parse content",
      url,
      status: response.status,
      error: errorText,
    });
    throw new Error(`Failed to parse content: ${response.statusText}`);
  }

  const text = await response.text();
  return text;
}
