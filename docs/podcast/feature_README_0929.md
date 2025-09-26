## atypica.AI Project Architecture Summary

**atypica.AI** is an AI-powered business research intelligence platform that uses large language models to provide deep insights into consumer behavior and market understanding through AI-driven user research, persona building, and interview simulation.

### Core Architecture:
- **Frontend**: Next.js 14 with App Router
- **Database**: Prisma + PostgreSQL 15 with pgvector extension
- **AI Models**: Claude 3 + GPT-4o
- **Authentication**: NextAuth.js
- **Internationalization**: next-intl
- **Deployment**: Vercel with background job processing

### Multi-Agent Collaboration System:
- **Study Agent**: Overall coordinator, guides users through research needs
- **Scout Agent**: Discovers and categorizes target user groups
- **Interviewer Agent**: Conducts professional interviews and extracts key information
- **Persona Agent**: Simulates user responses and provides realistic feedback

## Podcast Feature Analysis

The podcast feature is a comprehensive implementation that transforms business research analysis into engaging audio content. Here's the current state:

### Current Implementation:

**1. Data Models (Prisma Schema):**
```typescript
model AnalystPodcast {
  id          Int       @id @default(autoincrement())
  token       String    @unique @db.VarChar(64)
  analystId   Int       @db.Integer
  analyst     Analyst   @relation(fields: [analystId], references: [id])
  instruction String    @db.Text
  script      String    @db.Text
  podcastUrl  String?   @db.VarChar(500)
  generatedAt DateTime? @db.Timestamptz(6)
  extra       Json      @default("{}")
  createdAt   DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(6)
}
```

**2. Core Features:**
- ✅ **Script Generation**: AI-powered podcast script creation using Claude/GPT models
- ✅ **Audio Generation**: Full TTS pipeline using Volcano TTS API via WebSocket
- ✅ **Background Processing**: Non-blocking generation with `waitUntil()` pattern
- ✅ **Real-time UI Updates**: Polling system for progress tracking
- ✅ **Audio Playback**: In-browser audio player with play/pause/download
- ✅ **Multi-language Support**: Chinese and English prompts
- ✅ **S3 Storage**: Audio file persistence with signed URLs

**3. Architecture Flow:**
```
User Request → Server Action → Background Job → AI Script Generation → WebSocket TTS → S3 Upload → Database Update → UI Refresh
```

**4. Key Files:**
- `lib.ts`: Core business logic (685 lines) - script generation, audio generation, analyst selection
- `actions.ts`: Server actions with authentication
- `prompt.ts`: Sophisticated prompt engineering for podcast scripts
- `components/PodcastsSection.tsx`: Complete UI with audio controls
- `api/podcast/generate/route.ts`: Background generation pipeline
- `api/podcast/retrieve/route.ts`: Podcast data retrieval

**5. Advanced Features:**
- **Analyst Selection**: LLM-powered selection of most interesting analysts using structured output
- **Script Preprocessing**: Audio-optimized script cleaning
- **Error Handling**: Comprehensive retry logic and status tracking
- **Token Management**: Cost tracking and user alerts
