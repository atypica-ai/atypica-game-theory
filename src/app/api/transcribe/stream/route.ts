import authOptions from "@/app/(auth)/authOptions";
import { proxiedFetch } from "@/lib/proxy/fetch";
import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { Locale } from "next-intl";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  console.log("🌊 Streaming transcription API called");

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    console.log("❌ Unauthorized access attempt to streaming API");
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") as Locale;
  const sessionId = searchParams.get("sessionId") || crypto.randomUUID();

  console.log("📋 Streaming request parameters:", {
    locale,
    sessionId,
    hasRequestBody: !!request.body,
  });

  if (!locale) {
    console.log("❌ No locale provided in streaming request");
    return new Response("Locale is required", { status: 400 });
  }

  const groqLanguage = locale === "zh-CN" ? "zh" : "en";
  console.log("🌐 Streaming language mapping:", { locale, groqLanguage });

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: async (url: any, init?: any) =>
      await proxiedFetch(url, {
        ...init,
        duplex: "half",
      }),
  });

  const encoder = new TextEncoder();
  let audioChunks: Uint8Array[] = [];
  let chunkCount = 0;
  const CHUNK_SIZE_THRESHOLD = 32 * 1024; // 32KB chunks for processing

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      const data = JSON.stringify({
        type: "connection",
        sessionId,
        message: "Connected to transcription stream",
      });
      console.log("🔗 SSE connection established:", { sessionId });
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      try {
        const reader = request.body?.getReader();
        if (!reader) {
          console.log("❌ No request body reader available");
          throw new Error("No request body");
        }

        console.log("📖 Starting to read audio stream...");

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log("🏁 Stream reading completed, processing final chunk");
            // Process final chunk if any data remains
            if (audioChunks.length > 0) {
              console.log(`🎬 Processing final chunk: ${audioChunks.length} segments`);
              await processAudioChunk(
                audioChunks,
                controller,
                groq,
                groqLanguage,
                chunkCount++,
                true,
              );
            }

            // Send completion message
            const completionData = JSON.stringify({
              type: "complete",
              sessionId,
              message: "Transcription complete",
            });
            console.log("✅ Sending completion message");
            controller.enqueue(encoder.encode(`data: ${completionData}\n\n`));
            controller.close();
            break;
          }

          if (value) {
            console.log(`📦 Received audio chunk: ${value.length} bytes`);
            audioChunks.push(value);

            // Calculate total size of accumulated chunks
            const totalSize = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
            console.log(
              `📊 Total accumulated size: ${totalSize} bytes (threshold: ${CHUNK_SIZE_THRESHOLD})`,
            );

            // Process chunk when it reaches threshold size
            if (totalSize >= CHUNK_SIZE_THRESHOLD) {
              console.log(`🚀 Processing chunk #${chunkCount} (${totalSize} bytes)`);
              await processAudioChunk(
                [...audioChunks],
                controller,
                groq,
                groqLanguage,
                chunkCount++,
                false,
              );
              // Keep overlapping chunks for better transcription continuity
              audioChunks = audioChunks.slice(-1); // Keep last chunk
              console.log("♻️ Kept overlapping chunk for continuity");
            }
          }
        }
      } catch (error) {
        console.error("❌ Stream processing error:", {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          sessionId,
          chunkCount,
        });
        const errorData = JSON.stringify({
          type: "error",
          sessionId,
          error: "Failed to process audio stream",
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

async function processAudioChunk(
  audioChunks: Uint8Array[],
  controller: ReadableStreamDefaultController,
  groq: Groq,
  language: string,
  chunkIndex: number,
  isFinal: boolean,
) {
  try {
    console.log(`🔄 Processing audio chunk #${chunkIndex} (${isFinal ? "FINAL" : "PARTIAL"})`);

    // Combine chunks into a single buffer
    const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedBuffer = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of audioChunks) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(`📦 Combined buffer size: ${totalLength} bytes from ${audioChunks.length} chunks`);

    // Create a blob from the combined buffer - try to create a proper audio format
    const audioBlob = new Blob([combinedBuffer], { type: "audio/webm" });

    // Skip very small chunks unless it's the final chunk
    if (audioBlob.size < 2048 && !isFinal) {
      console.log(`⏸️ Skipping small chunk #${chunkIndex}: ${audioBlob.size} bytes`);
      return;
    }

    const encoder = new TextEncoder();

    // Send processing status
    const processingData = JSON.stringify({
      type: "processing",
      chunkIndex,
      size: audioBlob.size,
      isFinal,
    });
    console.log(`📤 Sending processing status for chunk #${chunkIndex}`);
    controller.enqueue(encoder.encode(`data: ${processingData}\n\n`));

    // Create a File object for Groq API
    const audioFile = new File([audioBlob], `chunk_${chunkIndex}.webm`, {
      type: "audio/webm",
    });

    console.log(`🚀 Sending chunk #${chunkIndex} to Groq API: ${audioFile.size} bytes`);
    const startTime = Date.now();

    // Transcribe the audio chunk
    const result = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3",
      response_format: "json",
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Groq API response for chunk #${chunkIndex}:`, {
      processingTime: `${processingTime}ms`,
      textLength: result.text?.length || 0,
      text: result.text,
      isFinal,
    });

    if (result.text && result.text.trim()) {
      const transcriptData = JSON.stringify({
        type: "transcript",
        chunkIndex,
        text: result.text.trim(),
        language,
        isFinal,
        confidence: 0,
      });
      console.log(`📝 Sending transcript for chunk #${chunkIndex}: "${result.text.trim()}"`);
      controller.enqueue(encoder.encode(`data: ${transcriptData}\n\n`));
    } else {
      console.log(`⚠️ No text received for chunk #${chunkIndex}`);
    }
  } catch (error) {
    console.error(`❌ Error processing chunk ${chunkIndex}:`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      chunkIndex,
      isFinal,
    });
    const encoder = new TextEncoder();
    const errorData = JSON.stringify({
      type: "error",
      chunkIndex,
      error: `Failed to process audio chunk: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
