import "server-only";

import { TextToSpeechLongAudioSynthesizeClient } from "@google-cloud/text-to-speech";
import { Logger } from "pino";
import { AudioCache } from "../cache/audioCache";
import { PodcastGenerationOptions, PodcastGenerationResult } from "../volcano/client";
import { Storage } from "@google-cloud/storage";
/**
 * Google Cloud TTS Client for podcast audio generation
 *
 * This client uses Google's Text-to-Speech Long Audio Synthesis API
 * to generate podcast audio. It only supports:
 * - Single speaker podcasts
 * - English (en-US) locale
 *
 * For other cases, use the Volcano TTS client instead.
 */
export class GoogleTTSClient {
  private client: TextToSpeechLongAudioSynthesizeClient;
  private projectId: string;
  private location: string;
  private gcsBucket: string;
  private logger?: Logger;

  constructor(
    config: {
      projectId: string;
      location?: string;
      gcsBucket: string;
    },
    logger?: Logger,
  ) {
    this.projectId = config.projectId;
    this.location = config.location || "global";
    this.gcsBucket = config.gcsBucket;
    this.logger = logger;

    // Initialize Google Cloud TTS client with Application Default Credentials
    // The user mentioned auth is already prepared via environment variables
    this.client = new TextToSpeechLongAudioSynthesizeClient();
  }

  /**
   * Get the validated number of podcast hosts for TTS generation
   * Returns 1 if only one unique host is detected, otherwise returns 2+
   */
  private getValidatedHostCount(script: string): number {
    // Regular expression to match host markers like 【Guy】, 【Ira】, 【凯】, 【艾拉】
    const hostMarkerRegex = /【([^】]+)】/g;
    const hosts = new Set<string>();

    let match;
    while ((match = hostMarkerRegex.exec(script)) !== null) {
      const hostName = match[1].trim();
      if (hostName) {
        hosts.add(hostName);
      }
    }

    return hosts.size || 1; // Default to 1 if no markers found
  }

  /**
   * Clean a single line of podcast script by removing markdown and stage directions
   */
  private cleanPodcastScriptLine(line: string): string | null {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      return null;
    }
    return trimmed
      .replace(/^#.*$/gm, "")
      .replace(/\*/g, "")
      .replace(/【[^】]*】/g, "")
      .trim();
  }

  /**
   * Parse markdown podcast script into plain text
   * Removes host markers and combines all dialogue into a single text
   */
  private parseScriptToText(script: string): string {
    const lines = script.split("\n").filter((line) => line.trim());
    const textParts: string[] = [];

    for (const line of lines) {
      const cleanedText = this.cleanPodcastScriptLine(line);
      if (cleanedText && cleanedText.length > 0) {
        textParts.push(cleanedText);
      }
    }

    return textParts.join(" ");
  }

  /**
   * Check if Google TTS can be used for this podcast
   * Requirements: single speaker and en-US locale
   */
  static canUseGoogleTTS(script: string, locale: string): boolean {
    if (locale !== "en-US") {
      return false;
    }

    // Check for single speaker
    const hostMarkerRegex = /【([^】]+)】/g;
    const hosts = new Set<string>();

    let match;
    while ((match = hostMarkerRegex.exec(script)) !== null) {
      const hostName = match[1].trim();
      if (hostName) {
        hosts.add(hostName);
      }
    }

    // If no markers found, assume single speaker (default)
    // If exactly one unique host, it's single speaker
    return hosts.size === 0 || hosts.size === 1;
  }

  /**
   * Download audio file from Google Cloud Storage
   */
  private async downloadFromGCS(gcsUri: string): Promise<Buffer> {
    // Extract bucket and object name from GCS URI (format: gs://bucket-name/object-name)
    const match = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid GCS URI format: ${gcsUri}`);
    }

    const [, bucketName, objectName] = match;

    // Use Google Cloud Storage client to download
    // Since auth is prepared, we can use Application Default Credentials
    const storage = new Storage();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectName);

    // Download the file
    const [buffer] = await file.download();
    return Buffer.from(buffer);
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

    this.logger?.info({ msg: "Starting Google TTS podcast audio generation", podcastToken });

    // Validate that we can use Google TTS
    if (!GoogleTTSClient.canUseGoogleTTS(script, locale)) {
      throw new Error(
        "Google TTS can only be used for single speaker podcasts with en-US locale",
      );
    }

    try {
      // Parse script to plain text (remove host markers)
      const text = this.parseScriptToText(script);

      if (!text || text.trim().length === 0) {
        throw new Error("No dialogue content found in script");
      }

      this.logger?.info({
        msg: "Parsed script for Google TTS",
        textLength: text.length,
      });

      // Generate unique GCS output path
      const outputObjectName = `podcast-audio/${podcastToken}-${Date.now()}.mp3`;
      const outputGcsUri = `gs://${this.gcsBucket}/${outputObjectName}`;

      // Prepare the synthesis request
      const parent = `projects/${this.projectId}/locations/${this.location}`;

      const request = {
        parent,
        input: {
          prompt: "speak in the style of solo-cast podcast with opinion",
          text: text,
        },
        voice: {
          languageCode: "en-us",
          name: "Kore", // Default English voice, can be customized
          model: "gemini-2.5-flash-tts"
        },
        audioConfig: {
          audioEncoding: "MP3" as const,
          sampleRateHertz: 24000,
        },
        outputGcsUri,
      };

      this.logger?.info({
        msg: "Starting long audio synthesis",
        outputGcsUri,
        textLength: text.length,
      });

      // Start the long audio synthesis operation
      const [operation] = await this.client.synthesizeLongAudio(request);

      // Wait for the operation to complete
      this.logger?.info({
        msg: "Waiting for synthesis operation to complete",
        operationName: operation.name,
      });

      const [response] = await operation.promise();

      this.logger?.info({
        msg: "Synthesis operation completed",
        response,
      });

      // Download the synthesized audio from GCS
      this.logger?.info({
        msg: "Downloading audio from GCS",
        gcsUri: outputGcsUri,
      });

      const synthesizedAudio = await this.downloadFromGCS(outputGcsUri);

      this.logger?.info({
        msg: "Downloaded audio from GCS",
        size: synthesizedAudio.byteLength,
      });

      // Load prologue and epilogue audio
      const SILENCE = await AudioCache.get("silence");
      const prologueAudio = await AudioCache.getPrologue(locale);
      const epilogueAudio = await AudioCache.getEpilogue(locale);

      // Concatenate: prologue + silence + synthesized audio + silence + epilogue
      const audioChunks: Buffer[] = [];

      // Add prologue
      try {
        audioChunks.push(prologueAudio);
        audioChunks.push(SILENCE);
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

      // Add synthesized audio
      audioChunks.push(synthesizedAudio);

      // Add epilogue
      try {
        audioChunks.push(SILENCE);
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

      // Clean up: delete the temporary file from GCS
      try {
        const storage = new Storage();
        const bucket = storage.bucket(this.gcsBucket);
        const file = bucket.file(outputObjectName);
        await file.delete();
        this.logger?.info({
          msg: "Cleaned up temporary GCS file",
          objectName: outputObjectName,
        });
      } catch (error) {
        this.logger?.warn({
          msg: "Failed to clean up temporary GCS file (non-critical)",
          error: error instanceof Error ? error.message : String(error),
        });
      }

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
  const gcsBucket = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

  if (!projectId || !gcsBucket) {
    throw new Error(
      "Missing Google Cloud configuration. Please set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_STORAGE_BUCKET environment variables.",
    );
  }

  return new GoogleTTSClient(
    {
      projectId,
      gcsBucket,
    },
    logger,
  );
}
