# Testing Pulse Internal APIs Using curl Commands

## Gather Pulses API
This API runs in the following order in its process:
1. gather pulses
2. fixIdentity
3. Calculate Heat and Heat delta
4. Set Expiration according to Heat Delta

```bash
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/internal/gather-pulses
```

## Calculate Heat API

**Process today's unscored pulses:**
```bash
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/internal/calculate-heat
```

**Process specific category:**
```bash
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/api/internal/calculate-heat?categoryId=1"
```

**Process all unscored pulses (ignores date/category filters):**
```bash
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/api/internal/calculate-heat?onlyUnscored=true"
```

**Retry failed pulse IDs:**
```bash
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"pulseIds": [123, 456, 789]}' \
  http://localhost:3000/api/internal/calculate-heat
```

**Query Parameters:**
- `categoryId` (optional): Process specific category only
- `includeAlreadyScored` (optional): Include pulses that already have HEAT scores (default: false)
- `onlyUnscored` (optional): Process all unscored pulses, ignores date/category filters (default: false)

**Body Parameters:**
- `pulseIds` (optional): Array of pulse IDs to retry (if provided, query params are ignored)

## Expire Pulses API

**Process today's pulses:**
```bash
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/internal/expire-pulses
```

**Process specific category:**
```bash
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/api/internal/expire-pulses?categoryId=1"
```

**Retry failed pulse IDs:**
```bash
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"pulseIds": [123, 456, 789]}' \
  http://localhost:3000/api/internal/expire-pulses
```

**Query Parameters:**
- `categoryId` (optional): Process specific category only

**Body Parameters:**
- `pulseIds` (optional): Array of pulse IDs to retry (if provided, query params are ignored)

## Recommend Pulses API

**Basic usage:**
```bash
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/internal/recommend-pulses
```

**With custom config:**
```bash
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "userActiveDays": 30,
    "pulseFreshHours": 24,
    "maxRecommendedPulses": 10,
    "maxPulsesToFilter": 30
  }' \
  http://localhost:3000/api/internal/recommend-pulses
```

**Config Parameters (all optional):**
- `userActiveDays` (number): Users who logged in within last N days (default: 30)
- `pulseFreshHours` (number): Pulses created within last N hours (default: 24)
- `maxRecommendedPulses` (number): Maximum pulses to recommend per user (default: 10)
- `maxPulsesToFilter` (number): Maximum pulses to fetch for filtering/LLM input (default: 30)
## Expected Responses

### Gather Pulses API

**Success:**
```json
{
  "success": true,
  "message": "Scheduled pulse gathering for all dataSources"
}
```

### Calculate Heat API

**Success:**
```json
{
  "success": true,
  "message": "Scheduled HEAT calculation pipeline",
  "pulseCount": 15
}
```

### Expire Pulses API

**Success:**
```json
{
  "success": true,
  "message": "Scheduled expiration test",
  "pulseCount": 20
}
```

### Recommend Pulses API

**Success Response:**
```json
{
  "success": true,
  "message": "Pulse recommendation scheduled for active users",
  "totalUsers": 15,
  "scheduledAt": "2024-01-10T12:00:00.000Z"
}
```

**Success Response (with custom config):**
The API will log the custom config overrides if provided:
```json
{
  "success": true,
  "message": "Pulse recommendation scheduled for active users",
  "totalUsers": 15,
  "scheduledAt": "2024-01-10T12:00:00.000Z"
}
```
Check server logs for: `"Using custom config overrides"` with the provided values.

**No Active Users:**
```json
{
  "success": true,
  "totalUsers": 0,
  "processedUsers": 0,
  "successfulUsers": 0,
  "failedUsers": 0,
  "totalPulsesRecommended": 0
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

## Troubleshooting

### 401 Unauthorized

- Verify `INTERNAL_API_SECRET` is set correctly in `.env`
- Ensure the header name is exactly `x-internal-secret` (lowercase)
- Check that the secret value matches between `.env` and your request

### Connection Refused

- Ensure the development server is running (`pnpm dev`)
- Verify the port (default: 3000)
- Check if the URL is correct

### Background Processing

All APIs use `waitUntil` for background execution, so they return immediately. To monitor actual processing:

1. Check server logs for detailed execution logs
2. Query the database to verify results
3. Check pulse `extra.error` field for failed pulses

## Monitoring Results

### Check Generated Pulses

```sql
-- Count pulses created today
SELECT COUNT(*) FROM "Pulse" 
WHERE "createdAt" >= CURRENT_DATE;

-- View recent pulses
SELECT id, title, "dataSource", "createdAt" 
FROM "Pulse" 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

### Check Generated Recommendations

```sql
-- Count recommendations created today
SELECT COUNT(*) FROM "UserPulseRecommendation" 
WHERE "createdAt" >= CURRENT_DATE;

-- View recent recommendations
SELECT id, "userId", "pulseIds", extra, "createdAt" 
FROM "UserPulseRecommendation" 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

## Production Testing

For production, update the base URL to `https://atypica.ai`:

```bash
# Calculate Heat - Retry failed pulses
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"pulseIds": [123, 456]}' \
  https://atypica.ai/api/internal/calculate-heat

# Expire Pulses - Retry failed pulses
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"pulseIds": [123, 456]}' \
  https://atypica.ai/api/internal/expire-pulses
```

