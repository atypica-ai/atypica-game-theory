import WebSocket from 'ws';

// Message types from the protocol
export enum MsgType {
  Invalid = 0,
  FullClientRequest = 0b1,
  AudioOnlyClient = 0b10,
  FullServerResponse = 0b1001,
  AudioOnlyServer = 0b1011,
  FrontEndResultServer = 0b1100,
  Error = 0b1111,
}

export enum MsgTypeFlagBits {
  NoSeq = 0,
  PositiveSeq = 0b1,
  LastNoSeq = 0b10,
  NegativeSeq = 0b11,
  WithEvent = 0b100,
}

export enum VersionBits {
  Version1 = 1,
  Version2 = 2,
  Version3 = 3,
  Version4 = 4,
}

export enum HeaderSizeBits {
  HeaderSize4 = 1,
  HeaderSize8 = 2,
  HeaderSize12 = 3,
  HeaderSize16 = 4,
}

export enum SerializationBits {
  Raw = 0,
  JSON = 0b1,
  Thrift = 0b11,
  Custom = 0b1111,
}

export enum CompressionBits {
  None = 0,
  Gzip = 0b1,
  Custom = 0b1111,
}

// Event types from the protocol
export enum EventType {
  StartConnection = 1,
  FinishConnection = 2,
  ConnectionStarted = 50,
  ConnectionFinished = 52,
  StartSession = 100,
  FinishSession = 102,
  SessionStarted = 150,
  SessionFinished = 152,
  UsageResponse = 154,
  PodcastRoundStart = 360,
  PodcastRoundResponse = 361,
  PodcastRoundEnd = 362,
  PodcastEnd = 363,
}

/**
 * Protocol message structure
 */
export interface Message {
  version: VersionBits
  headerSize: HeaderSizeBits
  type: MsgType
  flag: MsgTypeFlagBits
  serialization: SerializationBits
  compression: CompressionBits
  event?: EventType
  sessionId?: string
  sequence?: number
  errorCode?: number
  payload: Uint8Array
  toString(): string
}

export function createMessage(
  msgType: MsgType,
  flag: MsgTypeFlagBits,
): Message {
  const msg = {
    type: msgType,
    flag: flag,
    version: VersionBits.Version1,
    headerSize: HeaderSizeBits.HeaderSize4,
    serialization: SerializationBits.JSON,
    compression: CompressionBits.None,
    payload: new Uint8Array(0),
  }

  // Use Object.defineProperty to add toString method
  Object.defineProperty(msg, 'toString', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function () {
      return `MsgType: ${MsgType[this.type]}, Event: ${this.event ? EventType[this.event] : 'None'}, PayloadSize: ${this.payload.length}`
    },
  })

  return msg as Message
}

/**
 * Message serialization
 */
export function marshalMessage(msg: Message): Uint8Array {
  const buffers: Uint8Array[] = []

  // Build base header
  const headerSize = 4 * msg.headerSize
  const header = new Uint8Array(headerSize)

  header[0] = (msg.version << 4) | msg.headerSize
  header[1] = (msg.type << 4) | msg.flag
  header[2] = (msg.serialization << 4) | msg.compression

  buffers.push(header)

  // Write fields based on message type and flags
  const writers = getWriters(msg)
  for (const writer of writers) {
    const data = writer(msg)
    if (data) buffers.push(data)
  }

  // Merge all buffers
  const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  for (const buf of buffers) {
    result.set(buf, offset)
    offset += buf.length
  }

  return result
}

function getWriters(msg: Message): Array<(msg: Message) => Uint8Array | null> {
  const writers: Array<(msg: Message) => Uint8Array | null> = []

  if (msg.flag === MsgTypeFlagBits.WithEvent) {
    writers.push(writeEvent, writeSessionId)
  }

  switch (msg.type) {
    case MsgType.AudioOnlyClient:
    case MsgType.AudioOnlyServer:
    case MsgType.FrontEndResultServer:
    case MsgType.FullClientRequest:
    case MsgType.FullServerResponse:
      if (
        msg.flag === MsgTypeFlagBits.PositiveSeq ||
        msg.flag === MsgTypeFlagBits.NegativeSeq
      ) {
        writers.push(writeSequence)
      }
      break
    case MsgType.Error:
      writers.push(writeErrorCode)
      break
  }

  writers.push(writePayload)
  return writers
}

function writeEvent(msg: Message): Uint8Array | null {
  if (msg.event === undefined) return null
  const buffer = new Uint8Array(4)
  const view = new DataView(buffer.buffer)
  view.setUint32(0, msg.event, false) // big-endian
  return buffer
}

function writeSessionId(msg: Message): Uint8Array | null {
  if (!msg.sessionId) return null
  const sessionIdBytes = new TextEncoder().encode(msg.sessionId)
  const buffer = new Uint8Array(4 + sessionIdBytes.length)
  const view = new DataView(buffer.buffer)
  view.setUint32(0, sessionIdBytes.length, false) // big-endian
  buffer.set(sessionIdBytes, 4)
  return buffer
}

function writeSequence(msg: Message): Uint8Array | null {
  if (msg.sequence === undefined) return null
  const buffer = new Uint8Array(4)
  const view = new DataView(buffer.buffer)
  view.setUint32(0, msg.sequence, false) // big-endian
  return buffer
}

function writeErrorCode(msg: Message): Uint8Array | null {
  if (msg.errorCode === undefined) return null
  const buffer = new Uint8Array(4)
  const view = new DataView(buffer.buffer)
  view.setUint32(0, msg.errorCode, false) // big-endian
  return buffer
}

function writePayload(msg: Message): Uint8Array | null {
  if (msg.payload.length === 0) return null
  const buffer = new Uint8Array(4 + msg.payload.length)
  const view = new DataView(buffer.buffer)
  view.setUint32(0, msg.payload.length, false) // big-endian
  buffer.set(msg.payload, 4)
  return buffer
}

/**
 * Message deserialization
 */
export function unmarshalMessage(data: Uint8Array): Message {
  if (data.length < 3) {
    throw new Error(
      `data too short: expected at least 3 bytes, got ${data.length}`,
    )
  }

  let offset = 0

  // Read base header
  const versionAndHeaderSize = data[offset++]
  const typeAndFlag = data[offset++]
  const serializationAndCompression = data[offset++]

  const msg = {
    version: (versionAndHeaderSize >> 4) as VersionBits,
    headerSize: (versionAndHeaderSize & 0b00001111) as HeaderSizeBits,
    type: (typeAndFlag >> 4) as MsgType,
    flag: (typeAndFlag & 0b00001111) as MsgTypeFlagBits,
    serialization: (serializationAndCompression >> 4) as SerializationBits,
    compression: (serializationAndCompression & 0b00001111) as CompressionBits,
    payload: new Uint8Array(0),
  }

  Object.defineProperty(msg, 'toString', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function () {
      return `MsgType: ${MsgType[this.type]}, Event: ${this.event ? EventType[this.event] : 'None'}, PayloadSize: ${this.payload.length}`
    },
  })

  // Read remaining header bytes if any
  const headerSize = 4 * msg.headerSize
  offset = headerSize

  // Read fields based on message type and flags
  const readers = getReaders(msg as Message)
  for (const reader of readers) {
    offset = reader(msg as Message, data, offset)
  }

  return msg as Message
}

function getReaders(
  msg: Message,
): Array<(msg: Message, data: Uint8Array, offset: number) => number> {
  const readers: Array<
    (msg: Message, data: Uint8Array, offset: number) => number
  > = []

  switch (msg.type) {
    case MsgType.AudioOnlyClient:
    case MsgType.AudioOnlyServer:
    case MsgType.FrontEndResultServer:
    case MsgType.FullClientRequest:
    case MsgType.FullServerResponse:
      if (
        msg.flag === MsgTypeFlagBits.PositiveSeq ||
        msg.flag === MsgTypeFlagBits.NegativeSeq
      ) {
        readers.push(readSequence)
      }
      break
    case MsgType.Error:
      readers.push(readErrorCode)
      break
  }

  if (msg.flag === MsgTypeFlagBits.WithEvent) {
    readers.push(readEvent, readSessionId)
  }

  readers.push(readPayload)
  return readers
}

function readEvent(msg: Message, data: Uint8Array, offset: number): number {
  if (offset + 4 > data.length) {
    throw new Error(`data too short for event: expected 4 bytes at offset ${offset}`)
  }
  const view = new DataView(data.buffer, data.byteOffset + offset)
  msg.event = view.getUint32(0, false) as EventType // big-endian
  return offset + 4
}

function readSessionId(msg: Message, data: Uint8Array, offset: number): number {
  if (offset + 4 > data.length) {
    throw new Error(`data too short for session ID length: expected 4 bytes at offset ${offset}`)
  }
  const view = new DataView(data.buffer, data.byteOffset + offset)
  const sessionIdLength = view.getUint32(0, false) // big-endian
  offset += 4

  if (offset + sessionIdLength > data.length) {
    throw new Error(`data too short for session ID: expected ${sessionIdLength} bytes at offset ${offset}`)
  }
  msg.sessionId = new TextDecoder().decode(data.subarray(offset, offset + sessionIdLength))
  return offset + sessionIdLength
}

function readSequence(msg: Message, data: Uint8Array, offset: number): number {
  if (offset + 4 > data.length) {
    throw new Error(`data too short for sequence: expected 4 bytes at offset ${offset}`)
  }
  const view = new DataView(data.buffer, data.byteOffset + offset)
  msg.sequence = view.getUint32(0, false) // big-endian
  return offset + 4
}

function readErrorCode(msg: Message, data: Uint8Array, offset: number): number {
  if (offset + 4 > data.length) {
    throw new Error(`data too short for error code: expected 4 bytes at offset ${offset}`)
  }
  const view = new DataView(data.buffer, data.byteOffset + offset)
  msg.errorCode = view.getUint32(0, false) // big-endian
  return offset + 4
}

function readPayload(msg: Message, data: Uint8Array, offset: number): number {
  if (offset + 4 > data.length) {
    throw new Error(`data too short for payload length: expected 4 bytes at offset ${offset}`)
  }
  const view = new DataView(data.buffer, data.byteOffset + offset)
  const payloadLength = view.getUint32(0, false) // big-endian
  offset += 4

  if (offset + payloadLength > data.length) {
    throw new Error(`data too short for payload: expected ${payloadLength} bytes at offset ${offset}`)
  }
  msg.payload = data.subarray(offset, offset + payloadLength)
  return offset + payloadLength
}

export async function ReceiveMessage(ws: WebSocket): Promise<Message> {
  return new Promise((resolve, reject) => {
    const onMessage = (data: Buffer) => {
      ws.removeListener('message', onMessage);
      ws.removeListener('error', onError);
      ws.removeListener('close', onClose);
      
      try {
        const message = unmarshalMessage(new Uint8Array(data));
        resolve(message);
      } catch (error) {
        reject(error);
      }
    };
    
    const onError = (error: Error) => {
      ws.removeListener('message', onMessage);
      ws.removeListener('error', onError);
      ws.removeListener('close', onClose);
      reject(error);
    };
    
    const onClose = () => {
      ws.removeListener('message', onMessage);
      ws.removeListener('error', onError);
      ws.removeListener('close', onClose);
      reject(new Error('WebSocket connection closed'));
    };
    
    ws.on('message', onMessage);
    ws.on('error', onError);
    ws.on('close', onClose);
  });
}

export async function WaitForEvent(
  ws: WebSocket,
  expectedType: MsgType,
  expectedEvent: EventType
): Promise<Message> {
  while (true) {
    const message = await ReceiveMessage(ws);
    
    // Handle error messages immediately
    if (message.type === MsgType.Error) {
      const errorMsg = new TextDecoder().decode(message.payload);
      throw new Error(`Server error while waiting for event ${expectedEvent}: ${errorMsg}`);
    }
    
    if (message.type === expectedType && message.event === expectedEvent) {
      return message;
    }
    // Continue waiting for the expected event
  }
}

// Protocol functions
export async function StartConnection(ws: WebSocket): Promise<void> {
  const msg = createMessage(
    MsgType.FullClientRequest,
    MsgTypeFlagBits.WithEvent,
  )
  msg.event = EventType.StartConnection
  msg.payload = new TextEncoder().encode('{}')
  console.log(`[DEBUG] StartConnection: ${msg.toString()}`)
  const data = marshalMessage(msg)
  return new Promise((resolve, reject) => {
    ws.send(data, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

export async function StartSession(
  ws: WebSocket, 
  payload: Uint8Array, 
  sessionId: string
): Promise<void> {
  const msg = createMessage(
    MsgType.FullClientRequest,
    MsgTypeFlagBits.WithEvent,
  )
  msg.event = EventType.StartSession
  msg.sessionId = sessionId
  msg.payload = payload
  console.log(`[DEBUG] StartSession: ${msg.toString()}`)
  const data = marshalMessage(msg)
  return new Promise((resolve, reject) => {
    ws.send(data, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

export async function FinishSession(ws: WebSocket, sessionId: string): Promise<void> {
  const msg = createMessage(
    MsgType.FullClientRequest,
    MsgTypeFlagBits.WithEvent,
  )
  msg.event = EventType.FinishSession
  msg.sessionId = sessionId
  msg.payload = new TextEncoder().encode('{}')
  console.log(`[DEBUG] FinishSession: ${msg.toString()}`)
  const data = marshalMessage(msg)
  return new Promise((resolve, reject) => {
    ws.send(data, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

export async function FinishConnection(ws: WebSocket): Promise<void> {
  const msg = createMessage(
    MsgType.FullClientRequest,
    MsgTypeFlagBits.WithEvent,
  )
  msg.event = EventType.FinishConnection
  msg.payload = new TextEncoder().encode('{}')
  console.log(`[DEBUG] FinishConnection: ${msg.toString()}`)
  const data = marshalMessage(msg)
  return new Promise((resolve, reject) => {
    ws.send(data, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

// Types for Volcano TTS API
export interface PodcastNLPText {
  speaker: string;
  text: string;
}

export interface PodcastRequestParams {
  input_id: string;
  action: 3; // We use action 3 for direct script conversion
  nlp_texts: PodcastNLPText[];
  use_head_music?: boolean;
  use_tail_music?: boolean;
  input_info?: {
    return_audio_url?: boolean;
  };
  audio_config?: {
    format?: string;
    sample_rate?: number;
    speech_rate?: number;
  };
  speaker_info?: {
    random_order?: boolean;
    speakers?: string[];
  };
}

export interface VolcanoHeaders {
  'X-Api-App-Id': string;
  'X-Api-App-Key': string;
  'X-Api-Access-Key': string;
  'X-Api-Resource-Id': string;
  'X-Api-Connect-Id': string;
  [key: string]: string;
} 