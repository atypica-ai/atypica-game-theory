// node 18 和 20 的 fetch 函数不直接使用代理，需要额外实现
// https://stackoverflow.com/questions/72306101/make-a-request-in-native-fetch-with-proxy-in-nodejs-18
import { HttpsProxyAgent } from "https-proxy-agent";
import { NextResponse } from "next/server";
import fetch from "node-fetch";

const proxyUrl = process.env.IMAGE_LOADER_HTTPS_PROXY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 });
  }
  try {
    const imageResponse = await fetch(url, {
      agent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
    });
    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
    }
    const imageData = await imageResponse.arrayBuffer();
    return new NextResponse(imageData, {
      headers: {
        "Content-Type": imageResponse.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error proxying image:", error);
    return NextResponse.json({ error: "Failed to proxy image" }, { status: 500 });
  }
}
