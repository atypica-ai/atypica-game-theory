# Batch Podcast Generation - Test Guide

## Overview
The batch podcast generation system automatically:
1. Selects the most interesting analysts with reports
2. Generates podcast scripts for them
3. Creates audio files using TTS
4. Processes everything in background

## API Endpoint

**URL**: `POST /api/podcast/batch-generate`
**Auth**: Requires `x-internal-secret` header with `INTERNAL_API_SECRET`

## Request Parameters

```json
{
  "batchSize": 10,      // Optional: Analysts per batch (1-50, default: 10)
  "targetCount": 10,    // Optional: Total podcasts to generate (1-100, default: 10)
  "poolLimit": 10       // Optional: Pool size to select from (1-100, default: 10)
}
```

## Example Usage

### 1. Using curl
```bash
curl -X POST http://localhost:3000/api/podcast/batch-generate \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: YOUR_INTERNAL_SECRET" \
  -d '{
    "batchSize": 5,
    "targetCount": 3,
    "poolLimit": 10
  }'
```

### 2. Using Node.js (for cron job)
```javascript
const response = await fetch('https://your-domain.com/api/podcast/batch-generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-internal-secret': process.env.INTERNAL_API_SECRET
  },
  body: JSON.stringify({
    batchSize: 10,
    targetCount: 5,
    poolLimit: 20
  })
});

const result = await response.json();
console.log(result);
```

## Response

### Success Response
```json
{
  "success": true,
  "message": "Batch podcast generation started",
  "params": {
    "batchSize": 10,
    "targetCount": 10,
    "poolLimit": 10
  },
  "startedAt": "2023-12-07T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "batchSize must be between 1 and 50"
}
```

## Process Flow

1. **Pool Selection**: Gets 10 most recently updated analysts with reports
2. **Batching**: Splits analysts into batches of 10
3. **AI Selection**: Uses LLM to select most interesting analysts from each batch
4. **Script Generation**: Creates podcast scripts using existing `generatePodcastScript`
5. **Audio Generation**: Converts scripts to audio using Volcano TTS
6. **Background Processing**: All processing happens asynchronously

## Monitoring

Check your application logs for detailed progress:

```
[INFO] Starting batch podcast generation (batchSize=10, targetCount=10)
[INFO] Analyst pool retrieved (poolSize=8, analystIds=[1,2,3,4,5,6,7,8])
[INFO] Starting batch selection (batchCount=1, targetCount=10)
[INFO] Processing batch 1/1 (batchSize=8, batchTargetCount=8)
[INFO] Batch 1 completed (batchSelectedCount=8, totalSelectedCount=8)
[INFO] Starting podcast generation for selected analysts (selectedCount=8)
[INFO] Starting podcast generation for analyst (analystId=1, progress=1/8)
[INFO] Script generation completed (podcastId=123, scriptLength=5420)
[INFO] Audio generation completed successfully
[INFO] Batch podcast generation completed (totalProcessed=8, successful=7, failed=1)
```

## Cron Job Setup

### Using GitHub Actions
```yaml
name: Generate Podcasts
on:
  schedule:
    - cron: '0 9 * * 1' # Every Monday at 9 AM
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Podcasts
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/podcast/batch-generate \
            -H "x-internal-secret: ${{ secrets.INTERNAL_API_SECRET }}" \
            -d '{"targetCount": 5}'
```

### Using Vercel Cron (vercel.json)
```json
{
  "crons": [
    {
      "path": "/api/cron/generate-podcasts",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

Then create `/api/cron/generate-podcasts/route.ts`:
```typescript
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/podcast/batch-generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': process.env.INTERNAL_API_SECRET!
    },
    body: JSON.stringify({
      targetCount: 5
    })
  });
  
  return Response.json(await response.json());
}
```

## Notes

- The API returns immediately after starting the background job
- Processing happens asynchronously using `waitUntil()`
- Individual analyst failures don't stop the batch process
- All generated podcasts are stored in the database with audio files in S3
- The system automatically detects language and uses appropriate TTS voices 