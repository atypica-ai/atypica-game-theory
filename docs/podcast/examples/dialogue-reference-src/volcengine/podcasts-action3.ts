import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import WebSocket from 'ws'
import * as uuid from 'uuid'
import * as dotenv from 'dotenv'
import {
  MsgType,
  EventType,
  ReceiveMessage,
  StartConnection,
  StartSession,
  FinishSession,
  FinishConnection,
  WaitForEvent,
} from '../protocols'

// Load environment variables
dotenv.config()

const ENDPOINT = 'wss://openspeech.bytedance.com/api/v3/sami/podcasttts'

// Default speaker pairs - alternating between these two
const DEFAULT_SPEAKERS = [
  'zh_male_dayixiansheng_v2_saturn_bigtts',
  'zh_female_mizaitongxue_v2_saturn_bigtts'
]

interface DialogueLine {
  speaker: string
  text: string
}

function parseTextFile(filePath: string): DialogueLine[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0) // Remove empty lines

  const dialogues: DialogueLine[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const speaker = DEFAULT_SPEAKERS[i % 2] // Alternate between speakers
    dialogues.push({
      speaker: speaker,
      text: lines[i]
    })
  }

  return dialogues
}

function main() {
  const program = new Command()
  program
    .name('podcasts-action3')
    .description('Generate podcast from text file using action=3 (direct dialogue generation)')
    .option('--file <file>', 'Path to text file with dialogue lines')
    .option('--appid <appid>', 'Application ID (or set VOLCENGINE_APP_ID in .env)')
    .option('--access_token <access_token>', 'Access Token (or set VOLCENGINE_ACCESS_TOKEN in .env)')
    .option('--resource_id [resource_id]', 'Audio Resource id', 'volc.service_type.10050')
    .option('--encoding [encoding]', 'Audio format', 'mp3')
    .option('--input_id [input_id]', 'Unique identifier', process.env.INPUT_ID || 'podcast_action3')
    .option('--use_head_music [use_head_music]', 'Enable head music', 'false')
    .option('--use_tail_music [use_tail_music]', 'Enable tail music', 'false')
    .option('--return_audio_url [return_audio_url]', 'Enable return audio url', 'false')
    .option('--skip_round_audio_save [skip_round_audio_save]', 'Skip saving individual round audio files', 'true')
    .action(async (options) => {
      // Get credentials from options or environment variables
      const appid = options.appid || process.env.VOLCENGINE_APP_ID
      const access_token = options.access_token || process.env.VOLCENGINE_ACCESS_TOKEN

      // Validation
      if (!appid || !access_token) {
        console.error('❌ Error: Application ID and Access Token are required')
        console.error('   Set them via --appid and --access_token options')
        console.error('   OR set VOLCENGINE_APP_ID and VOLCENGINE_ACCESS_TOKEN in .env file')
        process.exit(1)
      }

      if (!options.file) {
        console.error('❌ Error: --file parameter is required')
        console.error('   Usage: npm run action3 -- --file path/to/dialogue.txt')
        process.exit(1)
      }

      let dialogues: DialogueLine[]
      try {
        dialogues = parseTextFile(options.file)
        console.log(`📖 Parsed ${dialogues.length} dialogue lines from ${options.file}`)
        console.log('🎭 Speaker assignment:')
        dialogues.forEach((d, i) => {
          const speakerName = d.speaker.includes('dayixiansheng') ? 'Male Speaker' : 'Female Speaker'
          console.log(`   Line ${i + 1}: ${speakerName} - "${d.text.substring(0, 50)}${d.text.length > 50 ? '...' : ''}"`)
        })
      } catch (error) {
        console.error(`❌ Error parsing file: ${error}`)
        process.exit(1)
      }

      // Build request headers
      const headers = {
        'X-Api-App-Id': appid,
        'X-Api-App-Key': 'aGjiRDfUWi',
        'X-Api-Access-Key': access_token,
        'X-Api-Resource-Id': options.resource_id,
        'X-Api-Connect-Id': uuid.v4(),
      }

      let isPodcastRoundEnd = true
      let audioReceived = false
      let lastRoundID = -1
      let taskID = ''
      let retryNum = 5
      const podcastAudio: Uint8Array[] = []
      let audio: Uint8Array[] = []
      let voice = ''
      let currentRound = 0
      let ws: WebSocket | null = null
      
      // Start timer for generation time tracking
      const startTime = Date.now()

      try {
        while (retryNum > 0) {
          console.log(`🔗 Connecting to ${ENDPOINT}...`)
          
          // Establish WebSocket connection
          ws = new WebSocket(ENDPOINT, {
            headers,
            skipUTF8Validation: true,
          })

          // Print WebSocket response headers
          ws.on('upgrade', (res) => {
            console.log('✅ WebSocket connected. Response headers:', res.headers['x-tt-logid'] ? { 'x-tt-logid': res.headers['x-tt-logid'] } : 'No special headers')
          })

          await new Promise<void>((resolve, reject) => {
            ws!.on('open', resolve)
            ws!.on('error', reject)
          })

          // Build request parameters for action=3
          const reqParams: any = {
            input_id: options.input_id,
            action: 3, // Direct dialogue generation
            nlp_texts: dialogues, // Use parsed dialogues
            use_head_music: String(options.use_head_music) === 'true',
            use_tail_music: String(options.use_tail_music) === 'true',
            input_info: {
              return_audio_url: String(options.return_audio_url) === 'true',
            },
            audio_config: {
              format: options.encoding,
              sample_rate: parseInt(process.env.SAMPLE_RATE || '24000'),
              speech_rate: 0,
            },
          }

          if (!isPodcastRoundEnd) {
            reqParams.retry_info = {
              retry_task_id: taskID,
              last_finished_round_id: lastRoundID,
            }
          }

          // Create output folder if it doesn't exist
          if (!fs.existsSync('output')) {
            fs.mkdirSync('output')
          }

          console.log('🚀 Starting podcast generation...')
          const generationStartTime = Date.now()

          // Start connection [event=1] -----------> server
          await StartConnection(ws!)
          // Connection started [event=50] <---------- server
          await WaitForEvent(ws!, MsgType.FullServerResponse, EventType.ConnectionStarted)

          const sessionID = uuid.v4()
          if (!taskID) taskID = sessionID
          
          // Start session [event=100] -----------> server
          await StartSession(ws!, new TextEncoder().encode(JSON.stringify(reqParams)), sessionID)
          // Session started [event=150] <---------- server
          await WaitForEvent(ws!, MsgType.FullServerResponse, EventType.SessionStarted)
          // Finish session [event=102] -----------> server
          await FinishSession(ws!, sessionID)

          console.log('🎤 Processing dialogue rounds...')

          while (true) {
            // Receive response content
            const msg = await ReceiveMessage(ws!)
            console.log(`📨 ${msg.toString()}`)

            switch (msg.type) {
              // Audio data chunks
              case MsgType.AudioOnlyServer:
                if (msg.event === EventType.PodcastRoundResponse) {
                  if (!audioReceived && audio.length > 0) {
                    audioReceived = true
                  }
                  audio.push(msg.payload)
                  console.log(`🔊 Received audio chunk | size: ${msg.payload.length} bytes`)
                }
                break
              
              // Error messages
              case MsgType.Error:
                throw new Error(`❌ Server error: ${new TextDecoder().decode(msg.payload)}`)
              
              case MsgType.FullServerResponse:
                // Podcast round start
                if (msg.event === EventType.PodcastRoundStart) {
                  const data = JSON.parse(new TextDecoder().decode(msg.payload))
                  voice = data.speaker || 'head_music'
                  currentRound = data.round_id
                  
                  if (currentRound === -1) {
                    console.log('🎵 Processing intro music...')
                    voice = 'head_music'
                  } else if (currentRound === 9999) {
                    console.log('🎵 Processing outro music...')
                    voice = 'tail_music'
                  } else {
                    const speakerName = voice.includes('dayixiansheng') ? 'Male Speaker' : 'Female Speaker'
                    console.log(`🎭 Round ${currentRound}: ${speakerName} - "${data.text || 'N/A'}"`)
                  }
                  
                  isPodcastRoundEnd = false
                  
                // Podcast round end
                } else if (msg.event === EventType.PodcastRoundEnd) {
                  const data = JSON.parse(new TextDecoder().decode(msg.payload))
                  const isErr = data.is_error || false
                  if (isErr) {
                    console.log(`❌ Podcast round end with error: ${JSON.stringify(data)}`)
                    break
                  }
                  
                  isPodcastRoundEnd = true
                  lastRoundID = currentRound
                  
                  if (audio.length > 0) {
                    if (String(options.skip_round_audio_save) !== 'true') {
                      // Save current audio with timestamp
                      const filename = `output/${voice}_${currentRound}_${Date.now()}.${options.encoding}`
                      await fs.promises.writeFile(filename, Buffer.concat(audio))
                      console.log(`💾 Saved individual round audio: ${filename}`)
                    } else {
                      console.log(`🔗 Round ${currentRound} audio collected (${Buffer.concat(audio).length} bytes) - will be included in final file`)
                    }
                    podcastAudio.push(...audio)
                    audio = []
                  }
                  
                } else if (msg.event === EventType.PodcastEnd) {
                  const data = JSON.parse(new TextDecoder().decode(msg.payload))
                  console.log(`🏁 Podcast end: ${JSON.stringify(data)}`)
                  
                  // Handle server-generated audio URL if available
                  if (data.meta_info && data.meta_info.audio_url) {
                    console.log(`📥 Server-generated audio URL: ${data.meta_info.audio_url}`)
                    if (String(options.return_audio_url) === 'true') {
                      try {
                        const response = await fetch(data.meta_info.audio_url)
                        if (response.ok) {
                          const audioBuffer = await response.arrayBuffer()
                          const inputFileName = path.basename(options.file, path.extname(options.file))
                          const filename = `output/podcast_server_${inputFileName}_${Date.now()}.${options.encoding}`
                          await fs.promises.writeFile(filename, Buffer.from(audioBuffer))
                          console.log(`🎉 Server-generated audio downloaded: ${filename}`)
                          console.log(`📊 Server audio size: ${audioBuffer.byteLength} bytes`)
                        } else {
                          console.error(`❌ Failed to download server audio: ${response.status} ${response.statusText}`)
                        }
                      } catch (error) {
                        console.error(`❌ Error downloading server audio: ${error}`)
                      }
                    }
                  }
                }
            }
            
            // Session finished
            if (msg.event === EventType.SessionFinished) {
              break
            }
          }
          
          // Maintain connection, wait for next round
          await FinishConnection(ws!)
          await WaitForEvent(ws!, MsgType.FullServerResponse, EventType.ConnectionFinished)
          
          // Podcast finished, save final audio
          if (isPodcastRoundEnd) {
            if (podcastAudio.length > 0) {
              const inputFileName = path.basename(options.file, path.extname(options.file))
              const filename = `output/podcast_${inputFileName}_${Date.now()}.${options.encoding}`
              await fs.promises.writeFile(filename, Buffer.concat(podcastAudio))
              console.log(`🎉 Final audio saved: ${filename}`)
              console.log(`📊 Total audio size: ${Buffer.concat(podcastAudio).length} bytes`)
            }
            
            // Calculate and report generation times
            const endTime = Date.now()
            const totalTimeMs = endTime - startTime
            const generationTimeMs = endTime - generationStartTime
            const totalTimeSeconds = (totalTimeMs / 1000).toFixed(2)
            const generationTimeSeconds = (generationTimeMs / 1000).toFixed(2)
            const totalTimeMinutes = (totalTimeMs / 60000).toFixed(2)
            
            console.log(`⏱️  Audio generation time: ${generationTimeSeconds}s`)
            console.log(`⏱️  Total time (including setup): ${totalTimeSeconds}s (${totalTimeMinutes} minutes)`)
            
            break
          } else {
            console.log(`⚠️  Current podcast not finished, resuming from round ${lastRoundID}`)
            retryNum--
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        }
      } finally {
        if (ws) {
          ws.close()
        }
        
        // Report final time in case of early termination
        const finalTime = Date.now()
        const finalDurationMs = finalTime - startTime
        if (finalDurationMs > 1000) { // Only show if process ran for more than 1 second
          const finalDurationSeconds = (finalDurationMs / 1000).toFixed(2)
          console.log(`⏱️  Session duration: ${finalDurationSeconds}s`)
        }
      }
    })
  
  program.parse()
}

main() 