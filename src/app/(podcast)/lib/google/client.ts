import "server-only";

import { proxiedFetch } from "@/lib/proxy/fetch";
import { GoogleAuth } from "google-auth-library";
import { Logger } from "pino";
import { AudioCache } from "../cache/audioCache";
import { parseScriptToText } from "../script/parser";
import { PodcastGenerationOptions, PodcastGenerationResult } from "../volcano/client";
import { splitStringIntoChunks } from "./utils";

/**
 * Google Cloud TTS Client for podcast audio generation
 *
 * This client uses Google's Text-to-Speech Long Audio Synthesis API
 * to generate podcast audio. It only supports:
 * - Single speaker podcasts
 * - English (en-US) locale
 *
 * For other cases, use the Volcano TTS client instead.
 *
 * Uses direct HTTP requests with proxiedFetch to support proxy configuration.
 */
export class GoogleTTSClient {
  private projectId: string;
  private logger?: Logger;

  constructor(
    config: {
      projectId: string;
    },
    logger?: Logger,
  ) {
    this.projectId = config.projectId;
    this.logger = logger;
  }

  /**
   * Retrieves an access token using Application Default Credentials.
   */
  async getAuthToken() {
    const auth = new GoogleAuth({
      // Optional: explicitly define scopes if needed, otherwise 'cloud-platform' is often the default
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    // This method automatically detects credentials from the GOOGLE_APPLICATION_CREDENTIALS
    // environment variable and generates an access token.
    const accessToken = await auth.getAccessToken();
    return accessToken;
  }

  /**
   * Start long audio synthesis operation
   */
  private async startSynthesis(text: string, accessToken: string): Promise<Buffer> {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize`;
    const requestBody = {
      input: {
        prompt:
          "You are Scott Galloway, the solo-cast of a opinion-heavy podcast where your voice is deep, raspy. At the end of sentences, your pitch goes down to signal authority. You sounds like you are the smartest person in the room, you deliver opinions as if they are absolute facts. Regarding pace, you introduces a topic slowly, and accelerates on data and factual lists. After the fast list, you pauses completely for 1-2 seconds before delivering your opinion.",
        text: text,
      },
      voice: {
        languageCode: "en-us",
        name: "Orus",
        modelName: "gemini-2.5-pro-tts",
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.2,
        sampleRateHertz: 44100,
      },
    };
    this.logger?.info({
      msg: "Starting long audio synthesis",
      url,
      textLength: text.length,
    });

    const response = await proxiedFetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "x-goog-user-project": this.projectId,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to start synthesis: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }
    // Parse JSON and decode base64 audioContent to Buffer
    const json = await response.json();
    if (!json.audioContent) {
      throw new Error("No audioContent found in synthesis response");
    }
    const audioChunk = Buffer.from(json.audioContent, "base64");
    return audioChunk;
  }

  /**
   * Fetch podcast audio using Google Cloud TTS Long Audio Synthesis API
   * Returns concatenated audio with prologue/epilogue and silence inserted
   */
  async fetchAudioChunks(options: PodcastGenerationOptions): Promise<PodcastGenerationResult> {
    const { script, podcastToken, locale = "en-US", hostCount, logger } = options;
    if (logger) {
      this.logger = logger;
    }

    this.logger?.info({
      msg: "Starting Google TTS podcast audio generation",
      podcastToken,
      hostCount,
    });

    try {
      // Parse script to plain text (remove host markers)
      const text = parseScriptToText(script);

      if (!text || text.trim().length === 0) {
        throw new Error("No dialogue content found in script");
      }

      this.logger?.info({
        msg: "Parsed script for Google TTS",
        textLength: text.length,
      });

      // Get access token
      const accessToken = await this.getAuthToken();
      if (!accessToken) {
        throw new Error("Failed to obtain Google Cloud access token.");
      }

      // Load prologue and epilogue audio
      // const SILENCE = await AudioCache.get("silence");
      const prologueAudio = await AudioCache.get("prologue_en-US_Google");
      const epilogueAudio = await AudioCache.get("epilogue_en-US_Google");

      const audioChunks: Buffer[] = [];

      // Add prologue
      try {
        audioChunks.push(prologueAudio);
        // audioChunks.push(SILENCE);
        this.logger?.info({
          msg: "Prologue audio added",
          locale,
        });
      } catch (error) {
        this.logger?.warn({
          msg: "Failed to load prologue audio, continuing without it",
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Split text into chunks and synthesize each chunk
      const chunks = splitStringIntoChunks(text, 1000);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        try {
          const audioChunk = await this.startSynthesis(chunk, accessToken);
          audioChunks.push(audioChunk);
          this.logger?.info({
            msg: "Audio chunk received.",
            chunkIndex: i + 1,
            totalChunks: chunks.length,
            size: audioChunk.byteLength,
          });

          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
        } catch (error) {
          this.logger?.error({
            msg: "Failed to synthesize chunk",
            chunkIndex: i + 1,
            error: error instanceof Error ? error.message : String(error as Error),
            chunk: chunk.substring(0, 100) + "...",
          });
          throw error; // Re-throw or handle as needed
        }
      }

      this.logger?.info({
        msg: "audio synthesis complete.",
        length: audioChunks.length,
      });

      // Add epilogue
      try {
        // audioChunks.push(SILENCE);
        audioChunks.push(epilogueAudio);
        this.logger?.info({
          msg: "Epilogue audio added",
          locale,
        });
      } catch (error) {
        this.logger?.warn({
          msg: "Failed to load epilogue audio, continuing without it",
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Concatenate all chunks
      const finalAudioBuffer = Buffer.concat(audioChunks);

      this.logger?.info({
        msg: "Audio chunks concatenated",
        totalSize: finalAudioBuffer.byteLength,
        chunks: audioChunks.length,
      });

      return {
        audioBuffer: finalAudioBuffer,
        mimeType: "audio/mpeg", // MP3 format
      };
    } catch (error) {
      this.logger?.error({
        msg: "Google TTS audio generation failed",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}

/**
 * Create a Google TTS client with environment configuration
 */
export function createGoogleTTSClient(logger?: Logger): GoogleTTSClient {
  const projectId = process.env.GOOGLE_VERTEX_PROJECT;

  if (!projectId) {
    throw new Error(
      "Missing Google Cloud configuration. Please set GOOGLE_VERTEX_PROJECT environment variable.",
    );
  }

  return new GoogleTTSClient(
    {
      projectId,
    },
    logger,
  );
}
