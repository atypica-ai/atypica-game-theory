# Gemini TTS Integration

## Overview

Our implementation uses Google's Gemini TTS API via direct REST API calls with `google-auth-library` for authentication. This approach supports proxy configuration through `proxiedFetch`.

**API Endpoint**: `https://texttospeech.googleapis.com/v1/text:synthesize`

**Current Usage**:

- Single-speaker podcasts
- English (en-US) locale
- Orus voice model (Scott Galloway style)
- Text chunking for inputs > 1000 characters

## Required Environment Variables

### Option 1: Service Account File (Recommended for Development)

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
GOOGLE_VERTEX_PROJECT=your-project-id
```

### Option 2: Manual Credentials (Recommended for Production/CI)

```bash
GOOGLE_VERTEX_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_VERTEX_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_VERTEX_PROJECT=your-project-id
```

**Note**: The private key must include newline characters (`\n`). When setting in environment variables, ensure proper escaping.

## Authentication

### Setting Up Application Default Credentials

Application Default Credentials (ADC) is the recommended authentication method. It works automatically in the following environments:

1. **Local Development**: Using `gcloud` CLI

   ```bash
   gcloud auth application-default login
   ```

2. **Google Cloud Environments**: Automatically available in:
   - Google App Engine
   - Google Compute Engine
   - Google Kubernetes Engine

3. **Service Account**: Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

### Creating a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **IAM & Admin** > **Service Accounts**
3. Click **Create Service Account**
4. Grant the following roles:
   - `Cloud Text-to-Speech User`
   - `Service Account Token Creator` (if using token generation)
5. Create and download a JSON key file

## API Parameters

### Available Models

- `gemini-2.5-flash-tts` - Faster, lower cost
- `gemini-2.5-pro-tts` - Higher quality (currently used)

### Available Voices

Our implementation uses **Orus**, but the following voices are available:

Achernar, Achird, Algenib, Algieba, Alnilam, Aoede, Autonoe, Callirrhoe, Charon, Despina, Enceladus, Erinome, Fenrir, Gacrux, Iapetus, Kore, Laomedeia, Leda, **Orus**, Puck, Pulcherrima, Rasalgethi, Sadachbia, Sadaltager, Schedar, Sulafat, Umbriel, Vindemiatrix, Zephyr, Zubenelgenubi

### Supported Languages

Our implementation currently uses `en-us`, but the API supports 100+ locales including:

- English: en-us, en-gb, en-au, en-in
- Chinese: cmn-cn, cmn-tw
- Spanish: es-es, es-mx, es-419
- And many more...

### Audio Formats

- `MP3` (currently used)
- `LINEAR16` (PCM)
- `OGG_OPUS`
- `MULAW`
- `ALAW`

## API Usage Example

### CURL Request

```bash
# Set your project ID
PROJECT_ID=your-project-id

# Make the request
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "prompt": "You are Scott Galloway, the solo-cast of a opinion-heavy podcast...",
      "text": "Your podcast text here"
    },
    "voice": {
      "languageCode": "en-us",
      "name": "Orus",
      "modelName": "gemini-2.5-pro-tts"
    },
    "audioConfig": {
      "audioEncoding": "MP3",
      "speakingRate": 1.2,
      "sampleRateHertz": 44100
    }
  }' \
  "https://texttospeech.googleapis.com/v1/text:synthesize"
```

### Response Format

```json
{
  "audioContent": "base64-encoded-audio-data"
}
```

The `audioContent` field contains the synthesized audio in base64 encoding.

## Implementation Details

### File Structure

```
src/app/(podcast)/lib/
├── google/
│   ├── client.ts      # GoogleTTSClient implementation
│   ├── index.ts       # Exports
│   └── utils.ts       # Text chunking utilities
├── selectEngine.ts    # Engine selection logic
└── generation.ts      # Main generation function
```

### Engine Selection

The system automatically selects between Google TTS and Volcano TTS based on:

- **Google TTS**: `en-US` locale + single speaker (hostCount ≤ 1)
- **Volcano TTS**: All other cases (multi-speaker or other locales)

See `src/app/(podcast)/lib/selectEngine.ts` for implementation.

### Text Chunking

Due to API input limits (~4000 bytes), long texts are automatically split into chunks of 1000 characters. Each chunk is processed separately and the results are concatenated.

See `src/app/(podcast)/lib/google/utils.ts` for implementation.

### Caching

Audio segments (prologue, epilogue, silence) are cached in `src/app/(podcast)/lib/cache/audioCacheStore.json` as base64-encoded MP3 data.

## Troubleshooting

### Authentication Errors

**Error**: `Could not load the default credentials`

**Solutions**:

1. Verify `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
2. Check the service account key file exists and is valid
3. Ensure the service account has the required permissions
4. Try running `gcloud auth application-default login`

### API Errors

**Error**: `403 Forbidden`

- Check project billing is enabled
- Verify the Text-to-Speech API is enabled in your project
- Confirm the service account has the `Cloud Text-to-Speech User` role

**Error**: `400 Bad Request`

- Verify the request body format matches the API specification
- Check that text length doesn't exceed limits
- Ensure the voice name and language code are compatible

### Proxy Issues

If you're behind a corporate proxy, ensure proxy configuration is set in `src/lib/proxy/fetch.ts`.

## References

- [Google Cloud Text-to-Speech API Documentation](https://cloud.google.com/text-to-speech/docs)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Service Account Authentication](https://cloud.google.com/docs/authentication/provide-credentials-adc)
- [Gemini TTS Models](https://cloud.google.com/text-to-speech/docs/gemini)
