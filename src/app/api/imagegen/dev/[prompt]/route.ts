import { generateGPTImage } from "@/app/(study)/artifacts/lib/imagegen";
import { rootLogger } from "@/lib/logging";
import { createHash } from "crypto";
import fs from "node:fs";
import path from "node:path";

export async function GET(req: Request, { params }: { params: Promise<{ prompt: string }> }) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not allowed", { status: 403 });
  }

  const { prompt } = await params;
  const ratio = "square";

  const promptHash = createHash("sha256")
    .update(JSON.stringify({ prompt, ratio }))
    .digest("hex")
    .substring(0, 40);

  const fileFullPath = path.join(process.cwd(), `public/_public/images/${promptHash}.png`);
  if (fs.existsSync(fileFullPath)) {
    const buffer = await fs.promises.readFile(fileFullPath);
    const response = new Response(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": buffer.length.toString(),
      },
    });
    return response;
  }

  const result = await generateGPTImage({
    prompt,
    ratio: "square",
    promptHash,
    genLog: rootLogger,
  });

  const { getObjectUrl } = result;
  const imageResponse = await fetch(getObjectUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  await fs.promises.writeFile(fileFullPath, Buffer.from(imageBuffer));

  const response = new Response(Buffer.from(imageBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": imageBuffer.byteLength.toString(),
    },
  });
  return response;
}
