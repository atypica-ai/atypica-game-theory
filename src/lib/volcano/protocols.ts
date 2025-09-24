import WebSocket from 'ws';

// Message types from the protocol
export enum MsgType {
  FullClientRequest = 0b1001,
  AudioOnlyServer = 0b1011,
  FullServerResponse = 0b1001,
  Error = 0b1111,
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

// Binary protocol implementation
export interface BinaryMessage {
  type: MsgType;
  event: EventType;
  payload: Uint8Array;
  sessionId?: string;
}

// Parse incoming binary message
export function parseMessage(data: Buffer): BinaryMessage {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  
  // Parse header (4 bytes)
  const byte0 = view.getUint8(0);
  const byte1 = view.getUint8(1);
  const byte2 = view.getUint8(2);
  
  // Extract fields from header
  const protocolVersion = (byte0 >> 4) & 0xf;
  const headerSize = byte0 & 0xf;
  const messageType = (byte1 >> 4) & 0xf;
  const messageFlags = byte1 & 0xf;
  const serializationMethod = (byte2 >> 4) & 0xf;
  const compressionMethod = byte2 & 0xf;
  
  // Determine message type
  let type: MsgType;
  if (messageType === 0b1011 || (messageType === 0b1001 && messageFlags === 0b0100)) {
    type = messageType === 0b1011 ? MsgType.AudioOnlyServer : MsgType.FullServerResponse;
  } else if (messageType === 0b1111) {
    type = MsgType.Error;
  } else {
    type = MsgType.FullServerResponse;
  }
  
  // Extract event type (4 bytes after header)
  const event = view.getUint32(4, false); // big-endian
  
  // Extract session ID length and session ID
  let sessionId: string | undefined;
  let payloadStart = 12;
  if (messageFlags === 0b0100) {
    const sessionIdLength = view.getUint32(8, false); // big-endian
    sessionId = new TextDecoder().decode(data.subarray(12, 12 + sessionIdLength));
    payloadStart = 12 + sessionIdLength;
    
    // Skip payload length (4 bytes)
    payloadStart += 4;
  }
  
  // Extract payload
  const payload = new Uint8Array(data.subarray(payloadStart));
  
  return {
    type,
    event,
    payload,
    sessionId,
  };
}

// Create binary message
function createMessage(
  messageType: number,
  messageFlags: number,
  event: EventType,
  payload: Uint8Array,
  sessionId?: string
): Buffer {
  const sessionIdBytes = sessionId ? new TextEncoder().encode(sessionId) : new Uint8Array();
  const sessionIdLength = sessionIdBytes.length;
  
  // Calculate total size
  const headerSize = 4;
  const eventSize = 4;
  const sessionIdLengthSize = sessionId ? 4 : 0;
  const payloadLengthSize = sessionId ? 4 : 0;
  const totalSize = headerSize + eventSize + sessionIdLengthSize + sessionIdLength + payloadLengthSize + payload.length;
  
  const buffer = Buffer.alloc(totalSize);
  const view = new DataView(buffer.buffer);
  
  // Write header
  view.setUint8(0, 0b00010001); // Protocol v1, 4-byte header
  view.setUint8(1, (messageType << 4) | messageFlags);
  view.setUint8(2, 0b00010000); // JSON serialization, no compression
  view.setUint8(3, 0); // Reserved
  
  // Write event type
  view.setUint32(4, event, false); // big-endian
  
  let offset = 8;
  
  // Write session ID if present
  if (sessionId) {
    view.setUint32(offset, sessionIdLength, false); // big-endian
    offset += 4;
    buffer.set(sessionIdBytes, offset);
    offset += sessionIdLength;
    
    // Write payload length
    view.setUint32(offset, payload.length, false); // big-endian
    offset += 4;
  }
  
  // Write payload
  buffer.set(payload, offset);
  
  return buffer;
}

// Protocol functions
export async function StartConnection(ws: WebSocket): Promise<void> {
  const payload = new TextEncoder().encode('{}');
  const message = createMessage(0b1001, 0b0100, EventType.StartConnection, payload);
  
  return new Promise((resolve, reject) => {
    ws.send(message, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function StartSession(
  ws: WebSocket, 
  payload: Uint8Array, 
  sessionId: string
): Promise<void> {
  const message = createMessage(0b1001, 0b0100, EventType.StartSession, payload, sessionId);
  
  return new Promise((resolve, reject) => {
    ws.send(message, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function FinishSession(ws: WebSocket, sessionId: string): Promise<void> {
  const payload = new TextEncoder().encode('{}');
  const message = createMessage(0b1001, 0b0100, EventType.FinishSession, payload, sessionId);
  
  return new Promise((resolve, reject) => {
    ws.send(message, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function FinishConnection(ws: WebSocket): Promise<void> {
  const payload = new TextEncoder().encode('{}');
  const message = createMessage(0b1001, 0b0100, EventType.FinishConnection, payload);
  
  return new Promise((resolve, reject) => {
    ws.send(message, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function ReceiveMessage(ws: WebSocket): Promise<BinaryMessage> {
  return new Promise((resolve, reject) => {
    const onMessage = (data: Buffer) => {
      ws.removeListener('message', onMessage);
      ws.removeListener('error', onError);
      ws.removeListener('close', onClose);
      
      try {
        const message = parseMessage(data);
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
): Promise<BinaryMessage> {
  while (true) {
    const message = await ReceiveMessage(ws);
    if (message.type === expectedType && message.event === expectedEvent) {
      return message;
    }
    // Continue waiting for the expected event
  }
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