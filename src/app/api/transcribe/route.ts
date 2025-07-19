import authOptions from "@/app/(auth)/authOptions";
import { proxiedFetch } from "@/lib/proxy/fetch";
import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { Locale } from "next-intl";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: 首先需要授权，以防止被滥用，其次，这需要扣减用户的 token

  const formData = await request.formData();
  const audio = formData.get("audio") as File;
  const locale = formData.get("locale") as Locale;

  if (!audio) {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  }

  const groqLanguage = locale === "zh-CN" ? "zh" : "en";

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: async (url: any, init?: any) =>
      await proxiedFetch(url, {
        ...init,
        duplex: "half",
      }),
  });

  try {
    const result = await groq.audio.transcriptions.create({
      file: audio,
      model: "whisper-large-v3",
      response_format: "verbose_json",
    });
    return NextResponse.json({
      text: result.text,
      language: groqLanguage,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "Failed to transcribe audio" }, { status: 500 });
  }
}
