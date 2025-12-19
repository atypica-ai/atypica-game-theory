import "server-only";

import { Logger } from "pino";
import { v4 as uuidv4 } from "uuid";
import WebSocket from "ws";
import { AudioCache } from "../cache/audioCache";
import { cleanPodcastScriptLine } from "../script/cleaner";
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
  hostCount: 1 | 2; // Number of hosts for audio generation (1 = solo, 2 = duo) - REQUIRED
  logger?: Logger;
}

export interface PodcastGenerationResult {
  audioBuffer: Buffer;
  duration?: number;
  mimeType: string;
  error?: string;
}

// Default speaker configuration
const DEFAULT_SPEAKERS = {
  "zh-CN": ["zh_male_dayixiansheng_v2_saturn_bigtts", "zh_female_mizaitongxue_v2_saturn_bigtts"],
  "en-US": ["zh_male_liufei_v2_saturn_bigtts", "zh_male_xiaolei_v2_saturn_bigtts"],
};

export class VolcanoTTSClient {
  private config: VolcanoTTSConfig;
  private logger?: Logger;

  constructor(config: VolcanoTTSConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Parse markdown podcast script into NLP texts format
   * Uses provided hostCount to determine speaker allocation
   */
  private parseScriptToNLPTexts(
    script: string,
    locale: string = "zh-CN",
    hostCount: 1 | 2,
  ): PodcastNLPText[] {
    // Get the default speakers for the locale
    const allSpeakers =
      DEFAULT_SPEAKERS[locale as keyof typeof DEFAULT_SPEAKERS] || DEFAULT_SPEAKERS["zh-CN"];

    // Adjust speakers array based on host count
    // If only 1 host, use only the first speaker
    // If 2 hosts, use 1st and 2nd speakers
    const speakers = allSpeakers.slice(0, hostCount);

    this.logger?.info({
      msg: "Podcast configuration",
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
      const cleanedText = cleanPodcastScriptLine(trimmedLine);
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
          nlpTexts.push({
            speaker,
            text: chunk,
          });
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
   * Fetch podcast audio chunks from Volcano TTS API
   * Returns concatenated audio with silence inserted between rounds
   * Does NOT perform S3 upload - that's the caller's responsibility
   */
  async fetchAudioChunks(options: PodcastGenerationOptions): Promise<PodcastGenerationResult> {
    const { script, podcastToken, locale = "zh-CN", hostCount, logger } = options;
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
          // Parse script to NLP texts with provided hostCount
          const nlpTexts = this.parseScriptToNLPTexts(script, locale, hostCount);
          // this.logger?.info({ msg: "Parsed script to NLP texts", nlpTexts });

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

          // this.logger?.info('WebSocket connection established');

          // Start connection protocol
          try {
            await StartConnection(ws);
            await WaitForEvent(ws, MsgType.FullServerResponse, EventType.ConnectionStarted);
            // this.logger?.info('Connection started');
          } catch (error) {
            this.logger?.error({
              msg: "Connection protocol failed",
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
          }

          // Prepare session parameters
          const usedSpeakers = [...new Set(nlpTexts.map((nlpText) => nlpText.speaker))];
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
              speakers: usedSpeakers,
            },
          };

          // Start session
          try {
            const sessionPayload = new TextEncoder().encode(JSON.stringify(reqParams));
            await StartSession(ws, sessionPayload, sessionId);
            await WaitForEvent(ws, MsgType.FullServerResponse, EventType.SessionStarted);
            // this.logger?.info('Session started', { nlpTextsCount: reqParams.nlp_texts.length });

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

          // Process events
          let duration: number | undefined;
          let currentRound = 0;
          let totalRounds = 0;
          const audioChunks: Uint8Array[] = [];

          // Load Audio Cache Early
          const SILENCE = await AudioCache.get("silence");
          const prologueAudio = await AudioCache.getPrologue(locale);
          const epilogueAudio = await AudioCache.getEpilogue(locale);

          // Add prologue audio at the beginning
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

          while (true) {
            const msg = await ReceiveMessage(ws);

            // Handle different message types
            switch (msg.type) {
              // Audio data chunks
              case MsgType.AudioOnlyServer:
                if (msg.event === EventType.PodcastRoundResponse) {
                  if (!msg.payload || msg.payload.length === 0) {
                    this.logger?.error({ msg: "Received empty audio payload" });
                    break;
                  }
                  audioChunks.push(msg.payload);
                }
                break;

              // Error messages
              case MsgType.Error:
                const errorMsg = new TextDecoder().decode(msg.payload);
                this.logger?.error({ msg: "Received error message from server", error: errorMsg });
                throw new Error(`Server error: ${errorMsg}`);

              // Metadata events
              case MsgType.FullServerResponse:
                if (msg.event === EventType.PodcastRoundStart) {
                  const startData = JSON.parse(new TextDecoder().decode(msg.payload));
                  currentRound = startData.round_id;
                  totalRounds = Math.max(totalRounds, currentRound);
                  this.logger?.info({
                    msg: `Podcast round ${currentRound} started`,
                    speaker: startData.speaker,
                  });

                  // Insert silence before this round (but not before the first round)
                  // Note: audioChunks.length > 0 check ensures we don't add silence before prologue
                  if (audioChunks.length > 0) {
                    audioChunks.push(SILENCE);
                    this.logger?.info({
                      msg: "Silence inserted before round",
                      round: currentRound,
                    });
                  }
                } else if (msg.event === EventType.PodcastRoundEnd) {
                  const endData = JSON.parse(new TextDecoder().decode(msg.payload));
                  if (endData.is_error) {
                    throw new Error(`Podcast round error: ${endData.error_msg}`);
                  }
                  if (endData.audio_duration) {
                    duration = (duration || 0) + endData.audio_duration;
                  }

                  this.logger?.info({
                    msg: `Podcast round ${currentRound} completed`,
                    duration: endData.audio_duration,
                    audioChunks: audioChunks.length,
                  });
                } else if (msg.event === EventType.PodcastEnd) {
                  this.logger?.info({
                    msg: "Podcast generation completed",
                    totalDuration: duration,
                    totalAudioChunks: audioChunks.length,
                  });
                } else if (msg.event === EventType.UsageResponse) {
                  const usageData = JSON.parse(new TextDecoder().decode(msg.payload));
                  this.logger?.info({ msg: "Usage info received", usageData });
                }
                break;
            }

            // Check for session finished - OUTSIDE the switch, after all message types are processed
            if (msg.event === EventType.SessionFinished) {
              this.logger?.info({
                msg: "Session finished, concatenating audio chunks",
                totalChunks: audioChunks.length,
              });

              // Clean up connection
              await FinishConnection(ws);
              await WaitForEvent(ws, MsgType.FullServerResponse, EventType.ConnectionFinished);

              // Add epilogue audio at the end
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

              // Validate we received audio data
              if (audioChunks.length === 0) {
                throw new Error("No audio data received from Volcano TTS");
              }

              // Concatenate all chunks into single buffer
              const finalAudioBuffer = Buffer.concat(audioChunks);

              this.logger?.info({
                msg: "Audio chunks concatenated",
                totalSize: finalAudioBuffer.byteLength,
              });

              // Return single concatenated buffer
              return {
                audioBuffer: finalAudioBuffer,
                duration,
                mimeType: "audio/mpeg", // Volcano TTS returns MP3 format
              };
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
