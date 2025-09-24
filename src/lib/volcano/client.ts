import "server-only";

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'pino';
import {
  StartConnection,
  StartSession,
  FinishSession,
  FinishConnection,
  WaitForEvent,
  ReceiveMessage,
  MsgType,
  EventType,
  PodcastRequestParams,
  PodcastNLPText,
  VolcanoHeaders,
  Message,
} from './protocols';

const VOLCANO_ENDPOINT = 'wss://openspeech.bytedance.com/api/v3/sami/podcasttts';

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
  'zh-CN': [
    'zh_male_dayixiansheng_v2_saturn_bigtts',
    'zh_female_mizaitongxue_v2_saturn_bigtts'
  ],
  'en-US': [
    'zh_male_dayixiansheng_v2_saturn_bigtts', // Using Chinese speakers for now
    'zh_female_mizaitongxue_v2_saturn_bigtts'
  ]
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
   */
  private parseScriptToNLPTexts(script: string, locale: string = 'zh-CN'): PodcastNLPText[] {
    const speakers = DEFAULT_SPEAKERS[locale as keyof typeof DEFAULT_SPEAKERS] || DEFAULT_SPEAKERS['zh-CN'];
    const nlpTexts: PodcastNLPText[] = [];
    
    // Split script into lines and extract dialogue
    const lines = script.split('\n').filter(line => line.trim());
    let currentSpeakerIndex = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip markdown headers, stage directions, etc.
      if (
        trimmedLine.startsWith('#') ||
        trimmedLine.startsWith('[') ||
        trimmedLine.startsWith('*') ||
        trimmedLine.startsWith('**') ||
        trimmedLine.length < 10 // Skip very short lines
      ) {
        continue;
      }
      
      // Clean up the text
      let text = trimmedLine
        .replace(/^\*\*.*?\*\*:?\s*/, '') // Remove speaker labels like **Host:**
        .replace(/^\w+:\s*/, '') // Remove simple speaker labels like Host:
        .replace(/\[.*?\]/g, '') // Remove stage directions
        .trim();
      
      if (text.length > 0) {
        nlpTexts.push({
          speaker: speakers[currentSpeakerIndex % speakers.length],
          text: text.substring(0, 300) // Volcano TTS limit per round
        });
        
        currentSpeakerIndex++;
      }
    }
    
    this.logger?.info(`Parsed script into ${nlpTexts.length} dialogue segments`);
    return nlpTexts;
  }

  /**
   * Generate podcast audio from script
   */
  async generatePodcastAudio(options: PodcastGenerationOptions): Promise<PodcastGenerationResult> {
    const { script, podcastToken, locale = 'zh-CN', logger } = options;
    
    if (logger) {
      this.logger = logger;
    }
    
    this.logger?.info('Starting podcast audio generation', { podcastToken });
    
    const headers: VolcanoHeaders = {
      'X-Api-App-Id': this.config.appId,
      'X-Api-App-Key': 'aGjiRDfUWi', // Fixed value from documentation
      'X-Api-Access-Key': this.config.accessToken,
      'X-Api-Resource-Id': this.config.resourceId || 'volc.service_type.10050',
      'X-Api-Connect-Id': uuidv4(),
    };
    
    this.logger?.debug('Request headers prepared', {
      appId: this.config.appId.substring(0, 8) + '...',
      accessTokenLength: this.config.accessToken.length,
      resourceId: headers['X-Api-Resource-Id'],
      connectId: headers['X-Api-Connect-Id']
    });
    
    let ws: WebSocket | null = null;
    let retryCount = 0;
    const maxRetries = 5;
    
    try {
      while (retryCount < maxRetries) {
        try {
          // Parse script to NLP texts
          const nlpTexts = this.parseScriptToNLPTexts(script, locale);
          
          if (nlpTexts.length === 0) {
            throw new Error('No dialogue content found in script');
          }
          
          // Establish WebSocket connection
          this.logger?.info(`Attempting connection (attempt ${retryCount + 1})`);
          ws = new WebSocket(VOLCANO_ENDPOINT, {
            headers,
            skipUTF8Validation: true,
          });
          
          // Wait for connection to open
          await new Promise<void>((resolve, reject) => {
            ws!.on('open', resolve);
            ws!.on('error', reject);
          });
          
          this.logger?.info('WebSocket connection established');
          
          // Start connection protocol
          try {
            this.logger?.debug('Sending StartConnection...');
            await StartConnection(ws);
            this.logger?.debug('StartConnection sent, waiting for ConnectionStarted event...');
            await WaitForEvent(ws, MsgType.FullServerResponse, EventType.ConnectionStarted);
            this.logger?.info('Connection started');
          } catch (error) {
            this.logger?.error('Connection protocol failed', { 
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
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
              format: 'mp3',
              sample_rate: 24000,
              speech_rate: 0,
            },
            speaker_info: {
              random_order: false,
              speakers: DEFAULT_SPEAKERS[locale as keyof typeof DEFAULT_SPEAKERS] || DEFAULT_SPEAKERS['zh-CN'],
            },
          };
          
          // Start session
          try {
            this.logger?.debug('Preparing session payload...', { 
              sessionId,
              nlpTextsCount: reqParams.nlp_texts.length 
            });
            const sessionPayload = new TextEncoder().encode(JSON.stringify(reqParams));
            this.logger?.debug('Sending StartSession...', { payloadSize: sessionPayload.length });
            await StartSession(ws, sessionPayload, sessionId);
            this.logger?.debug('StartSession sent, waiting for SessionStarted event...');
            await WaitForEvent(ws, MsgType.FullServerResponse, EventType.SessionStarted);
            this.logger?.info('Session started');
            
            // Finish session to start processing
            this.logger?.debug('Sending FinishSession...');
            await FinishSession(ws, sessionId);
            this.logger?.debug('FinishSession sent, starting event processing...');
          } catch (error) {
            this.logger?.error('Session setup failed', { 
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
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
            this.logger?.debug('Received message', { 
              type: msg.type, 
              event: msg.event, 
              payloadSize: msg.payload.length,
              messageString: msg.toString()
            });
            
            // Handle error messages first
            if (msg.type === MsgType.Error) {
              const errorMsg = new TextDecoder().decode(msg.payload);
              this.logger?.error('Received error message from server', { errorMsg });
              throw new Error(`Server error: ${errorMsg}`);
            }
            
            switch (msg.event) {
              case EventType.PodcastRoundStart:
                const startData = JSON.parse(new TextDecoder().decode(msg.payload));
                currentRound = startData.round_id;
                totalRounds = Math.max(totalRounds, currentRound);
                this.logger?.info(`Podcast round ${currentRound} started`, { speaker: startData.speaker });
                break;
                
              case EventType.PodcastRoundResponse:
                // Audio chunk received (we don't store individual chunks)
                this.logger?.debug(`Audio chunk received for round ${currentRound}`, { 
                  size: msg.payload.length 
                });
                break;
                
              case EventType.PodcastRoundEnd:
                const endData = JSON.parse(new TextDecoder().decode(msg.payload));
                if (endData.is_error) {
                  throw new Error(`Podcast round error: ${endData.error_msg}`);
                }
                if (endData.audio_duration) {
                  duration = (duration || 0) + endData.audio_duration;
                }
                this.logger?.info(`Podcast round ${currentRound} completed`, { 
                  duration: endData.audio_duration 
                });
                break;
                
              case EventType.PodcastEnd:
                const podcastData = JSON.parse(new TextDecoder().decode(msg.payload));
                audioUrl = podcastData.meta_info?.audio_url;
                this.logger?.info('Podcast generation completed', { 
                  audioUrl: audioUrl ? '[URL_PROVIDED]' : '[NO_URL]',
                  totalDuration: duration 
                });
                break;
                
              case EventType.SessionFinished:
                this.logger?.info('Session finished');
                
                // Clean up connection
                await FinishConnection(ws);
                await WaitForEvent(ws, MsgType.FullServerResponse, EventType.ConnectionFinished);
                
                return {
                  audioUrl,
                  duration,
                };
                
              case EventType.UsageResponse:
                const usageData = JSON.parse(new TextDecoder().decode(msg.payload));
                this.logger?.info('Usage info', usageData);
                break;
                
              default:
                this.logger?.debug('Received unknown event', { event: msg.event });
            }
          }
          
        } catch (error) {
          this.logger?.error('Generation attempt failed', { 
            attempt: retryCount + 1,
            error: error instanceof Error ? error.message : String(error)
          });
          
          if (ws) {
            try {
              ws.close();
            } catch (closeError) {
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
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      throw new Error('Max retries exceeded');
      
    } finally {
      if (ws) {
        try {
          ws.close();
        } catch (error) {
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
  
  logger?.debug('Volcano TTS configuration check', {
    hasAppId: !!appId,
    hasAccessToken: !!accessToken,
    appIdLength: appId?.length || 0,
    accessTokenLength: accessToken?.length || 0,
  });
  
  if (!appId || !accessToken) {
    throw new Error('Missing Volcano TTS configuration. Please set VOLCANO_APP_ID and VOLCANO_ACCESS_TOKEN environment variables.');
  }
  
  return new VolcanoTTSClient({
    appId,
    accessToken,
  }, logger);
} 