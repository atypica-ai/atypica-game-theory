import authOptions from "@/app/(auth)/authOptions";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { Locale } from "next-intl";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  rootLogger.info({
    msg: "🔊 Transcription API called",
    user: request.headers.get("user-agent"),
  });

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: 首先需要授权，以防止被滥用，其次，这需要扣减用户的 token

  const formData = await request.formData();
  const audio = formData.get("audio") as File;
  const locale = formData.get("locale") as Locale;
  const isFinal = formData.get("isFinal") === "true";

  rootLogger.info({
    msg: "📋 Request parameters:",
    audioSize: audio?.size,
    audioType: audio?.type,
    audioName: audio?.name,
    locale,
    isFinal,
  });

  if (!audio) {
    rootLogger.error(`❌ No audio file provided in request`);
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  }

  // Validate audio file
  if (audio.size === 0) {
    rootLogger.error(`❌ Empty audio file`);
    return NextResponse.json({ error: "Empty audio file" }, { status: 400 });
  }

  if (audio.size < 1000) {
    rootLogger.error(`❌ Audio file too small: ${audio.size} bytes`);
    return NextResponse.json({ error: "Audio file too small" }, { status: 400 });
  }

  // Check if audio type is supported
  const supportedTypes = ["audio/webm", "audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg"];
  const isValidType = supportedTypes.some((type) => audio.type.includes(type.split("/")[1]));

  if (!isValidType) {
    rootLogger.error(`❌ Unsupported audio type: ${audio.type}`);
    return NextResponse.json({ error: `Unsupported audio type: ${audio.type}` }, { status: 400 });
  }

  rootLogger.info("✅ Audio file validation passed");
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
    // For small chunks (streaming), use faster processing
    const responseFormat = isFinal ? "verbose_json" : "json";

    rootLogger.info({
      msg: "🚀 Sending to Groq API:",
      model: "whisper-large-v3",
      responseFormat,
      language: groqLanguage === "zh" ? "zh" : "en",
      audioSize: audio.size,
    });

    const startTime = Date.now();
    const result = await groq.audio.transcriptions.create({
      file: audio,
      model: "whisper-large-v3",
      response_format: responseFormat,
      language: groqLanguage === "zh" ? "zh" : "en",
    });
    const processingTime = Date.now() - startTime;

    rootLogger.info({
      msg: "✅ Groq API response received:",
      processingTime: `${processingTime}ms`,
      textLength: result.text?.length || 0,
      text: result.text,
      isFinal,
    });

    return NextResponse.json({
      text: result.text,
      language: groqLanguage,
      isFinal,
      confidence: 0,
    });
  } catch (error) {
    rootLogger.error({
      msg: "❌ Transcription error:",
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      audioSize: audio.size,
      audioType: audio.type,
      locale,
      isFinal,
    });
    return NextResponse.json(
      {
        error: "Failed to transcribe audio",
        isFinal,
      },
      { status: 500 },
    );
  }
}
