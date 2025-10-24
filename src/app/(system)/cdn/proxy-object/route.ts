import { s3SignedUrl } from "@/lib/attachments/s3";
import { proxiedFetch } from "@/lib/proxy/fetch";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * @todo 现在有了一个 AttachmentFile 表，所以可以把签名缓存在那里
 * @todo 不一定要服务端下载内容，可以支持加一个参数是否能 redirect，如果是，直接 302 到签名后的 url
 */
export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const objectUrl = requestUrl.searchParams.get("objectUrl") as string | null;
  const mimeType = requestUrl.searchParams.get("mimeType") as string | null;
  const parse = requestUrl.searchParams.get("parse") as string | null;
  if (!objectUrl || !mimeType) {
    return NextResponse.json({ error: "objectUrl and mimeType are required" }, { status: 400 });
  }

  const cacheDir = path.join(process.cwd(), ".next/cache/attachments");
  // if (!fs.existsSync(cacheDir)) {
  const hash = createHash("sha256").update(objectUrl).digest("hex");
  await fs.promises.mkdir(path.join(cacheDir, hash), { recursive: true });

  let buffer: Buffer;
  let contentType: string;
  const url = await s3SignedUrl(objectUrl);
  if (parse === "true") {
    contentType = "text/plain";
    const fileFullPath = path.join(cacheDir, hash, "parse.txt");
    if (fs.existsSync(fileFullPath)) {
      buffer = await fs.promises.readFile(fileFullPath);
    } else {
      const response = await proxiedFetch("https://r.jina.ai/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.JINA_API_KEY}`,
        },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        console.log(await response.text());
        return NextResponse.json({ error: "Failed to parse file" }, { status: 500 });
      }
      buffer = Buffer.from(await response.arrayBuffer());
      await fs.promises.writeFile(fileFullPath, buffer);
    }
  } else {
    contentType = mimeType;
    const fileName = objectUrl.split("?")[0].split("/").pop() as string;
    const fileFullPath = path.join(cacheDir, hash, fileName);
    if (fs.existsSync(fileFullPath)) {
      buffer = await fs.promises.readFile(fileFullPath);
    } else {
      const response = await proxiedFetch(url);
      if (!response.ok) {
        return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
      }
      buffer = Buffer.from(await response.arrayBuffer());
      await fs.promises.writeFile(fileFullPath, buffer);
    }
  }

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": buffer.byteLength.toString(),
    },
  });
}
