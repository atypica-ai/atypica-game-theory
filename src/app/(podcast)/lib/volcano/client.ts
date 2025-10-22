import "server-only";

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
  audioUrl?: string;
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
   * Detect the number of unique hosts in a podcast script
   * Extracts host names from markers like 【Guy】, 【Ira】, 【凯】, 【艾拉】
   * Returns the count, capped at 2 (Volcano TTS supports max 2 speakers)
   * 
   * @param script - The podcast script with host markers
   * @returns Number of unique hosts (1 or 2). 
   * important: if there are more than 2 hosts, return 2; if no hosts found, return 2 for backward compatibility.
   * 
   * @example
   * // Script with 2 hosts:
   * // 【Guy】AI, artificial intelligence is so hot right now...
   * // 【Ira】Exactly, the core question we're discussing today...
   * // Returns: 2
   * 
   * // Script with 1 host:
   * // 【Guy】Today we're discussing...
   * // 【Guy】In conclusion...
   * // Returns: 1
   */
  private detectPodcastHostCount(script: string): number {
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
    
    // Return the count, but cap at 2 (Volcano TTS limitation)
    // If no hosts detected, default to 2 for backward compatibility
    if (hostCount === 0) {
      return 2; // Default to 2 speakers if no markers found
    }
    
    return Math.min(hostCount, 2);
  }

  /**
   * Parse markdown podcast script into NLP texts format
   * Automatically detects the number of hosts and adjusts speaker allocation
   */
  private parseScriptToNLPTexts(script: string, locale: string = "zh-CN"): PodcastNLPText[] {
    // Detect the number of hosts in the script
    const hostCount = this.detectPodcastHostCount(script);
    
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
      locale 
    });
    
    const nlpTexts: PodcastNLPText[] = [];

    // Split script into lines and extract dialogue
    const lines = script.split("\n").filter((line) => line.trim());
    let currentSpeakerIndex = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip markdown headers, stage directions, etc.
      if (trimmedLine.startsWith("#")) {
        continue;
      }

      // Clean up the text
      const text = trimmedLine
        // Remove all lines starting with # (fixed regex to work with multiline)
        .replace(/^#.*$/gm, "")
        // Remove all *
        .replace(/\*/g, "")
        // Remove speaker labels like 【A】【B】
        .replace(/【[^】]*】/g, "")
        // Trim whitespace from beginning and end
        .trim();

      if (text.length > 0) {
        const speaker = speakers[currentSpeakerIndex % speakers.length];

        // Split long text into chunks if needed
        const textChunks = this.splitTextIntoChunks(text, 300, locale);

        // Add each chunk as a separate NLP text with the same speaker
        for (const chunk of textChunks) {
          nlpTexts.push({
            speaker: speaker,
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
   * Generate podcast audio from script
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
          let audioUrl: string | undefined;
          let duration: number | undefined;
          let currentRound = 0;
          let totalRounds = 0;

          while (true) {
            const msg = await ReceiveMessage(ws);

            // Handle error messages first
            if (msg.type === MsgType.Error) {
              const errorMsg = new TextDecoder().decode(msg.payload);
              this.logger?.error({ msg: "Received error message from server", error: errorMsg });
              throw new Error(`Server error: ${errorMsg}`);
            }

            switch (msg.event) {
              case EventType.PodcastRoundStart:
                const startData = JSON.parse(new TextDecoder().decode(msg.payload));
                currentRound = startData.round_id;
                totalRounds = Math.max(totalRounds, currentRound);
                // this.logger?.info(`Podcast round ${currentRound} started`, { speaker: startData.speaker });
                break;

              case EventType.PodcastRoundResponse:
                // Audio chunk received (we don't store individual chunks)
                break;

              case EventType.PodcastRoundEnd:
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
                });
                break;

              case EventType.PodcastEnd:
                const podcastData = JSON.parse(new TextDecoder().decode(msg.payload));
                audioUrl = podcastData.meta_info?.audio_url;
                this.logger?.info({
                  msg: "Podcast generation completed",
                  audioUrl: audioUrl ? "[URL_PROVIDED]" : "[NO_URL]",
                  totalDuration: duration,
                });
                break;

              case EventType.SessionFinished:
                this.logger?.info("Session finished");

                // Clean up connection
                await FinishConnection(ws);
                await WaitForEvent(ws, MsgType.FullServerResponse, EventType.ConnectionFinished);

                return {
                  audioUrl,
                  duration,
                };

              case EventType.UsageResponse:
                const usageData = JSON.parse(new TextDecoder().decode(msg.payload));
                this.logger?.info({ msg: "Usage info received", usageData });
                break;

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
