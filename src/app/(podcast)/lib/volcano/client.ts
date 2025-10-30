import "server-only";

import { uploadToS3 } from "@/lib/attachments/s3";
import { Logger } from "pino";
import { v4 as uuidv4 } from "uuid";
import WebSocket from "ws";
import {
  EventType,
  FinishConnection,
  FinishSession,
  MsgType,
  PodcastNLPText,
  PodcastRequestParams,
  ReceiveMessage,
  StartConnection,
  StartSession,
  VolcanoHeaders,
  WaitForEvent,
} from "./protocols";

const VOLCANO_ENDPOINT = "wss://openspeech.bytedance.com/api/v3/sami/podcasttts";

export interface VolcanoTTSConfig {
  appId: string;
  accessToken: string;
  resourceId?: string;
}

export interface PodcastGenerationOptions {
  script: string;
  podcastToken: string;
  locale?: string;
  logger?: Logger;
}

export interface PodcastGenerationResult {
  objectUrl: string;
  mimeType: string;
  duration?: number;
  error?: string;
}

// Default speaker configuration
const DEFAULT_SPEAKERS = {
  "zh-CN": ["zh_male_dayixiansheng_v2_saturn_bigtts", "zh_female_mizaitongxue_v2_saturn_bigtts"],
  "en-US": [
    "zh_male_dayixiansheng_v2_saturn_bigtts", // Using Chinese speakers for now
    "zh_female_mizaitongxue_v2_saturn_bigtts",
  ],
};

export class VolcanoTTSClient {
  private config: VolcanoTTSConfig;
  private logger?: Logger;

  constructor(config: VolcanoTTSConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Get the validated number of podcast hosts for TTS generation
   *
   * Extracts host names from markers like 【Guy】, 【Ira】, 【凯】, 【艾拉】 and returns
   * a validated count suitable for Volcano TTS generation.
   *
   * **Important behavioral notes:**
   * - Returns 1 if only one unique host is detected
   * - Returns 2 if multiple hosts are detected (capped at 2 due to Volcano TTS limitation)
   * - Returns 2 as default if no host markers found (for backward compatibility)
   *
   * @param script - The podcast script with host markers
   * @returns Validated host count for TTS (always 1 or 2)
   *
   * @example
   * // Script with 2 hosts: returns 2
   * // 【Guy】AI, artificial intelligence is so hot right now...
   * // 【Ira】Exactly, the core question we're discussing today...
   *
   * // Script with 1 host: returns 1
   * // 【Guy】Today we're discussing...
   * // 【Guy】In conclusion...
   *
   * // Script with 3+ hosts: returns 2 (capped)
   * // Script with no markers: returns 2 (default)
   */
  private getValidatedHostCount(script: string): 1 | 2 {
    // Regular expression to match host markers like 【Guy】, 【Ira】, 【凯】, 【艾拉】
    const hostMarkerRegex = /【([^】]+)】/g;
    const hosts = new Set<string>();

    let match;
    while ((match = hostMarkerRegex.exec(script)) !== null) {
      // match[1] contains the host name inside 【】
      const hostName = match[1].trim();
      if (hostName) {
        hosts.add(hostName);
      }
    }

    const hostCount = hosts.size;

    // Return the validated count, capped at 2 (Volcano TTS limitation)
    // If no hosts detected, default to 2 for backward compatibility
    if (hostCount === 0) {
      return 2; // Default to 2 speakers if no markers found
    }

    return Math.min(hostCount, 2) as 1 | 2;
  }

  // elsewhere in the class, define the function:
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
   * Parse markdown podcast script into NLP texts format
   * Automatically detects the number of hosts and adjusts speaker allocation
   */
  private parseScriptToNLPTexts(script: string, locale: string = "zh-CN"): PodcastNLPText[] {
    // Get the validated number of hosts in the script
    const hostCount = this.getValidatedHostCount(script);

    // Get the default speakers for the locale
    const allSpeakers =
      DEFAULT_SPEAKERS[locale as keyof typeof DEFAULT_SPEAKERS] || DEFAULT_SPEAKERS["zh-CN"];

    // Adjust speakers array based on detected host count
    // If only 1 host detected, use only the first speaker
    // If 2 hosts detected (or default), use both speakers
    const speakers = hostCount === 1 ? [allSpeakers[0]] : allSpeakers;

    this.logger?.info({
      msg: "Detected podcast configuration",
      hostCount,
      speakersUsed: speakers.length,
      locale,
    });

    const nlpTexts: PodcastNLPText[] = [];

    // Split script into lines and extract dialogue
    const lines = script.split("\n").filter((line) => line.trim());
    let currentSpeakerIndex = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      const cleanedText = this.cleanPodcastScriptLine(trimmedLine);
      if (!cleanedText) {
        continue;
      }
      const text = cleanedText;

      if (text.length > 0) {
        const speaker = speakers[currentSpeakerIndex % speakers.length];

        // Split long text into chunks if needed
        const textChunks = this.splitTextIntoChunks(text, 300, locale);

        // Add each chunk as a separate NLP text with the same speaker
        for (const chunk of textChunks) {
          const nlpTextObject: PodcastNLPText = {
            speaker,
            text: chunk,
          };
          nlpTexts.push(nlpTextObject);
        }

        currentSpeakerIndex++;
      }
    }

    return nlpTexts;
  }

  /**
   * Split text into chunks respecting language-specific boundaries
   */
  private splitTextIntoChunks(text: string, maxLength: number, locale: string): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    const isChinese = locale.startsWith("zh");

    let remainingText = text;

    while (remainingText.length > maxLength) {
      let splitIndex = this.findBestSplitPoint(remainingText, maxLength, isChinese);

      // If no good split point found, force split at maxLength
      if (splitIndex === -1) {
        splitIndex = maxLength;
      }

      chunks.push(remainingText.substring(0, splitIndex).trim());
      remainingText = remainingText.substring(splitIndex).trim();
    }

    // Add remaining text if any
    if (remainingText.length > 0) {
      chunks.push(remainingText);
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * Find the best point to split text based on language rules
   */
  private findBestSplitPoint(text: string, maxLength: number, isChinese: boolean): number {
    // Define sentence endings and punctuation based on language
    const sentenceEndings = isChinese
      ? ["。", "！", "？", "...", "……"]
      : [". ", "! ", "? ", ".\n", "!\n", "?\n"];

    const clauseSeparators = isChinese
      ? ["，", "、", "；", "：", "，\n", "；\n", "：\n"]
      : [", ", "; ", ": ", ",\n", ";\n", ":\n"];

    const searchText = text.substring(0, maxLength);

    // 1. Try to find sentence endings (best option)
    for (const ending of sentenceEndings) {
      const lastIndex = searchText.lastIndexOf(ending);
      if (lastIndex > maxLength * 0.5) {
        // Don't split too early
        return lastIndex + ending.length;
      }
    }

    // 2. Try to find clause separators (good option)
    for (const separator of clauseSeparators) {
      const lastIndex = searchText.lastIndexOf(separator);
      if (lastIndex > maxLength * 0.6) {
        // Don't split too early
        return lastIndex + separator.length;
      }
    }

    // 3. For English, try word boundaries
    if (!isChinese) {
      const lastSpaceIndex = searchText.lastIndexOf(" ");
      if (lastSpaceIndex > maxLength * 0.7) {
        // Don't split too early
        return lastSpaceIndex + 1;
      }
    }

    // 4. For Chinese, try common punctuation
    if (isChinese) {
      const commonPunctuation = ["的", "了", "在", "是", "和", "与", "或"];
      for (const punct of commonPunctuation) {
        const lastIndex = searchText.lastIndexOf(punct);
        if (lastIndex > maxLength * 0.8) {
          return lastIndex + punct.length;
        }
      }
    }

    // 5. No good split point found
    return -1;
  }

  /**
   * Generate podcast audio from script and upload to S3
   * Combines Volcano TTS generation, audio chunk collection, concatenation, and S3 upload
   */
  async generatePodcastAudio(options: PodcastGenerationOptions): Promise<PodcastGenerationResult> {
    const { script, podcastToken, locale = "zh-CN", logger } = options;

    if (logger) {
      this.logger = logger;
    }

    this.logger?.info({ msg: "Starting podcast audio generation", podcastToken });

    const headers: VolcanoHeaders = {
      "X-Api-App-Id": this.config.appId,
      "X-Api-App-Key": "aGjiRDfUWi", // Fixed value from documentation
      "X-Api-Access-Key": this.config.accessToken,
      "X-Api-Resource-Id": this.config.resourceId || "volc.service_type.10050",
      "X-Api-Connect-Id": uuidv4(),
    };

    let ws: WebSocket | null = null;
    let retryCount = 0;
    const maxRetries = 5;

    try {
      while (retryCount < maxRetries) {
        try {
          // Parse script to NLP texts
          const nlpTexts = this.parseScriptToNLPTexts(script, locale);

          if (nlpTexts.length === 0) {
            throw new Error("No dialogue content found in script");
          }

          // Establish WebSocket connection
          this.logger?.info(`Attempting connection (attempt ${retryCount + 1})`);
          ws = new WebSocket(VOLCANO_ENDPOINT, {
            headers,
            skipUTF8Validation: true,
          });

          // Wait for connection to open
          await new Promise<void>((resolve, reject) => {
            ws!.on("open", resolve);
            ws!.on("error", reject);
          });

          // Start connection protocol
          try {
            await StartConnection(ws);
            await WaitForEvent(ws, MsgType.FullServerResponse, EventType.ConnectionStarted);
          } catch (error) {
            this.logger?.error({
              msg: "Connection protocol failed",
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
          }

          // Prepare session parameters
          const sessionId = uuidv4();
          const reqParams: PodcastRequestParams = {
            input_id: podcastToken,
            action: 3, // Direct script conversion
            nlp_texts: nlpTexts,
            use_head_music: false,
            use_tail_music: false,
            input_info: {
              return_audio_url: true, // Get final download URL
            },
            audio_config: {
              format: "mp3",
              sample_rate: 24000,
              speech_rate: 0,
            },
            speaker_info: {
              random_order: false,
              speakers:
                DEFAULT_SPEAKERS[locale as keyof typeof DEFAULT_SPEAKERS] ||
                DEFAULT_SPEAKERS["zh-CN"],
            },
          };

          // Start session
          try {
            const sessionPayload = new TextEncoder().encode(JSON.stringify(reqParams));
            await StartSession(ws, sessionPayload, sessionId);
            await WaitForEvent(ws, MsgType.FullServerResponse, EventType.SessionStarted);

            // Finish session to start processing
            await FinishSession(ws, sessionId);
          } catch (error) {
            this.logger?.error({
              msg: "Session setup failed",
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
          }

          // Collect audio chunks following the official demo pattern
          // Arrays to collect audio chunks per round and overall
          const podcastAudio: Uint8Array[] = [];
          let audio: Uint8Array[] = [];
          let currentRound = 0;
          let duration: number | undefined;
          let isPodcastRoundEnd = true;
          let lastRoundID = -1;
          let serverAudioUrl: string | undefined;

          // Process events
          while (true) {
            const msg = await ReceiveMessage(ws);

            // Handle error messages first
            if (msg.type === MsgType.Error) {
              const errorMsg = new TextDecoder().decode(msg.payload);
              this.logger?.error({ msg: "Received error message from server", error: errorMsg });
              throw new Error(`Server error: ${errorMsg}`);
            }

            switch (msg.event) {
              // Audio data chunks - collect them as per official demo
              case EventType.PodcastRoundResponse:
                if (msg.type === MsgType.AudioOnlyServer) {
                  audio.push(msg.payload);
                  this.logger?.debug({
                    msg: "Received audio chunk",
                    size: msg.payload.length,
                  });
                }
                break;

              case EventType.PodcastRoundStart:
                const startData = JSON.parse(new TextDecoder().decode(msg.payload));
                currentRound = startData.round_id;
                isPodcastRoundEnd = false;
                this.logger?.debug({
                  msg: "Podcast round started",
                  round: currentRound,
                  speaker: startData.speaker,
                });
                break;

              case EventType.PodcastRoundEnd:
                const endData = JSON.parse(new TextDecoder().decode(msg.payload));
                if (endData.is_error) {
                  this.logger?.warn({
                    msg: "Podcast round ended with error",
                    round: currentRound,
                    error: endData.error_msg,
                  });
                  break;
                }

                // Concatenate round audio chunks following official demo pattern
                if (audio.length > 0) {
                  podcastAudio.push(...audio);
                  const roundSize = audio.reduce((sum, chunk) => sum + chunk.length, 0);
                  this.logger?.info({
                    msg: "Round audio collected",
                    round: currentRound,
                    size: roundSize,
                  });
                  audio = [];
                }

                if (endData.audio_duration) {
                  duration = (duration || 0) + endData.audio_duration;
                }

                isPodcastRoundEnd = true;
                lastRoundID = currentRound;
                break;

              case EventType.PodcastEnd:
                const podcastData = JSON.parse(new TextDecoder().decode(msg.payload));
                serverAudioUrl = podcastData.meta_info?.audio_url;
                this.logger?.info({
                  msg: "Podcast generation completed from server",
                  hasAudioUrl: !!serverAudioUrl,
                  totalDuration: duration,
                });
                break;

              case EventType.SessionFinished:
                this.logger?.info("Session finished");

                // Clean up connection
                await FinishConnection(ws);
                await WaitForEvent(ws, MsgType.FullServerResponse, EventType.ConnectionFinished);

                // Now handle audio upload to S3
                let audioBuffer: Uint8Array;

                if (podcastAudio.length > 0) {
                  // Use collected chunks if available
                  audioBuffer = new Uint8Array(
                    podcastAudio.reduce((sum, chunk) => sum + chunk.length, 0)
                  );
                  let offset = 0;
                  for (const chunk of podcastAudio) {
                    audioBuffer.set(chunk, offset);
                    offset += chunk.length;
                  }
                  this.logger?.info({
                    msg: "Audio concatenated from collected chunks",
                    totalSize: audioBuffer.byteLength,
                  });
                } else if (serverAudioUrl) {
                  // Fallback: download from server URL
                  this.logger?.info({
                    msg: "Downloading audio from server URL",
                    url: "[REDACTED]",
                  });

                  const audioResponse = await fetch(serverAudioUrl);
                  if (!audioResponse.ok) {
                    throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
                  }

                  // Check content length
                  const contentLength = audioResponse.headers.get("content-length");
                  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
                    throw new Error(`Audio file too large: ${contentLength} bytes (max 10MB)`);
                  }

                  // Download with streaming
                  const maxSize = 10 * 1024 * 1024;
                  let downloadedSize = 0;
                  const chunks: Uint8Array[] = [];

                  const reader = audioResponse.body?.getReader();
                  if (!reader) {
                    throw new Error("Failed to get audio response reader");
                  }

                  try {
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;

                      downloadedSize += value.length;
                      if (downloadedSize > maxSize) {
                        throw new Error(`Audio file too large: ${downloadedSize} bytes (max 10MB)`);
                      }

                      chunks.push(value);
                    }
                  } finally {
                    reader.releaseLock();
                  }

                  audioBuffer = new Uint8Array(downloadedSize);
                  let offset = 0;
                  for (const chunk of chunks) {
                    audioBuffer.set(chunk, offset);
                    offset += chunk.length;
                  }
                } else {
                  throw new Error("No audio data available (no collected chunks and no server URL)");
                }

                // Upload to S3
                const mimeType = "audio/mpeg";
                const keySuffix = `podcasts/${podcastToken}.mp3` as const;

                this.logger?.info({
                  msg: "Uploading audio to S3",
                  size: audioBuffer.byteLength,
                  keySuffix,
                });

                const { objectUrl } = await uploadToS3({
                  keySuffix,
                  fileBody: audioBuffer,
                  mimeType,
                });

                this.logger?.info({
                  msg: "Podcast generation and upload completed successfully",
                  objectUrl: "[REDACTED]",
                  mimeType,
                  duration,
                });

                return {
                  objectUrl,
                  mimeType,
                  duration,
                };

              default:
              // Ignore unknown events
            }
          }
        } catch (error) {
          this.logger?.error({
            msg: "Generation attempt failed",
            attempt: retryCount + 1,
            error: error instanceof Error ? error.message : String(error),
          });

          if (ws) {
            try {
              ws.close();
            } catch {
              // Ignore close errors
            }
            ws = null;
          }

          retryCount++;

          // If we've exhausted retries, throw the error
          if (retryCount >= maxRetries) {
            throw error;
          }

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
        }
      }

      throw new Error("Max retries exceeded");
    } finally {
      if (ws) {
        try {
          ws.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  }
}

/**
 * Create a Volcano TTS client with environment configuration
 */
export function createVolcanoClient(logger?: Logger): VolcanoTTSClient {
  const appId = process.env.VOLCANO_APP_ID;
  const accessToken = process.env.VOLCANO_ACCESS_TOKEN;

  if (!appId || !accessToken) {
    throw new Error(
      "Missing Volcano TTS configuration. Please set VOLCANO_APP_ID and VOLCANO_ACCESS_TOKEN environment variables.",
    );
  }

  return new VolcanoTTSClient(
    {
      appId,
      accessToken,
    },
    logger,
  );
}
