# Analyst Podcast Feature Implementation

## Overview

This document outlines the implementation of the podcast generation feature for the analyst page, which mirrors the existing report generation functionality but produces podcast scripts instead of HTML reports.

## Feature Requirements

- Add podcast script generation capability to analyst pages
- Mirror the exact same workflow as report generation (async background processing)
- Use similar UI patterns and token cost structure
- Generate podcast scripts optimized for audio content
- Prepare infrastructure for future audio file generation

## Architecture Overview

The podcast feature follows the same architectural patterns as the existing report system:

```
User Action → Background Processing → Database Storage → UI Display
     ↓                 ↓                    ↓              ↓
Generate Podcast → AI Script Generation → AnalystPodcast → Grid Display
```

## Database Schema

### New Model: `AnalystPodcast`

```prisma
model AnalystPodcast {
  id          Int       @id @default(autoincrement())
  token       String    @unique @db.VarChar(64)
  analystId   Int       @db.Integer
  analyst     Analyst   @relation(fields: [analystId], references: [id])
  instruction String    @db.Text
  script      String    @db.Text        // Generated podcast script (very long text)
  podcastUrl  String?   @db.VarChar(500) // Optional URL for future audio generation
  generatedAt DateTime? @db.Timestamptz(6)
  extra       Json      @default("{}")

  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)
}
```

### Updated Model: `Analyst`

```prisma
model Analyst {
  // ... existing fields ...
  interviews    AnalystInterview[]
  reports       AnalystReport[]
  podcasts      AnalystPodcast[]     // NEW: Added podcast relationship
  featuredStudy FeaturedStudy?
}
```

## Implementation Plan

### ✅ Phase 1: Database Migration (Completed)
- [x] Update Prisma schema with new `AnalystPodcast` model
- [x] Add podcast relationship to `Analyst` model
- [x] Create and apply database migration
- [x] Generate updated Prisma client types

### ✅ Phase 2: Backend Implementation (Completed)

#### 2.1 Server Actions (`/src/app/analyst/[id]/actions.ts`)
- [x] `fetchAnalystPodcasts()` - Retrieve podcasts for an analyst
- [x] `backgroundGeneratePodcast()` - Async podcast generation with placeholder logic

#### 2.2 AI Tools (`/src/ai/tools/experts/podcastGeneration/`)
- [x] Complete AI generation tool infrastructure 
- [x] Full script generation logic with streaming and persistence
- [x] Integration with `backgroundGeneratePodcast` action
- [x] Export to main tools registry

#### 2.3 Prompt System (`/src/ai/prompt/podcast/`)
- [x] Create podcast-specific prompt templates
- [x] Support for multiple locales (zh-CN, en-US)
- [x] Export from main prompt index

### ✅ Phase 3: Frontend Implementation (Completed)

#### 3.1 Podcast Section Component (`/src/app/analyst/[id]/AnalystPodcastsSection.tsx`)
- [x] Mirror structure of `AnalystReportsSection.tsx`
- [x] Grid display for podcast scripts with custom purple/blue gradient design
- [x] Generation button with custom prompt dialog
- [x] Loading states and progress indicators
- [x] Token cost warnings via `TokenAlertDialog`

#### 3.2 Page Integration
- [x] Update `page.tsx` to fetch podcast data
- [x] Update `AnalystDetail.tsx` to include podcast section
- [x] Add podcast section below reports section

## Component Structure

```
AnalystDetail.tsx
├── (Left Column)
│   ├── Analyst Info
│   └── Guide Section
└── (Right Column)
    ├── AnalystReportsSection.tsx (existing)
    └── AnalystPodcastsSection.tsx (new)
        ├── Header with Generate Button
        ├── Podcast Grid Display
        ├── Custom Prompt Dialog
        └── TokenAlertDialog
```

## File Structure

### New Files
```
/docs/
└── analyst-podcast-feature.md

/src/app/analyst/[id]/
└── AnalystPodcastsSection.tsx

/src/ai/tools/experts/podcastGeneration/
├── index.ts
└── types.ts

/src/ai/prompt/podcast/
├── podcastScript.ts
└── index.ts

/prisma/migrations/20250916080639_add_analyst_podcast/
└── migration.sql
```

### Modified Files
```
/prisma/schema.prisma                    ✅ Completed
/src/app/analyst/[id]/page.tsx          ✅ Completed
/src/app/analyst/[id]/AnalystDetail.tsx ✅ Completed
/src/app/analyst/[id]/actions.ts        ✅ Completed
/src/ai/prompt/index.ts                 ✅ Completed
/src/ai/tools/tools.ts                  ✅ Completed
```

## Technical Specifications

### Background Processing
- Uses same `backgroundWait()` pattern as reports
- Implements proper timeout handling (20 minutes)
- Includes comprehensive logging and error handling
- Status polling every 5 seconds on frontend

### Token Economics
- Similar cost structure to report generation
- Uses `TokenAlertDialog` for user confirmation
- Configurable token costs via component props

### UI/UX Patterns
- Consistent with existing report section
- Grid layout for script previews
- Loading spinners for generation status
- Modal dialogs for script preview and custom prompts

### Audio Integration (Future)
- `podcastUrl` field prepared for audio file storage
- Infrastructure ready for TTS integration
- Audio player components can be added later

## API Endpoints

### Server Actions
```typescript
// Fetch podcasts for an analyst
fetchAnalystPodcasts({ analystId: number }): Promise<ServerActionResult<AnalystPodcast[]>>

// Generate new podcast script
backgroundGeneratePodcast({
  analystId: number,
  instruction?: string,
  systemPrompt?: string
}): Promise<void>
```

### AI Tools
```typescript
// Generate podcast script
generatePodcastScript({
  analyst: Analyst,
  podcast: AnalystPodcast,
  instruction: string,
  locale: string,
  systemPrompt?: string
}): Promise<void>
```

## Prompt Engineering

### Podcast Script Prompts
- Conversational tone optimized for audio
- Proper pacing and transition cues
- Structured for easy reading/recording
- Multi-language support
- Placeholder implementation for initial version

## Testing Strategy

### Unit Tests
- Test server actions with mock data
- Validate podcast generation logic
- Test component rendering and interactions

### Integration Tests
- End-to-end podcast generation workflow
- Database operations and relationships
- Frontend-backend integration

## Future Enhancements

### Audio Generation
- Text-to-speech integration
- Voice selection and customization
- Audio file storage and streaming
- Podcast episode management

### Advanced Features
- Multi-speaker podcast support
- Background music integration
- Automatic chapter markers
- RSS feed generation for podcast distribution

## Security Considerations

- User authorization for podcast generation
- Rate limiting for AI tool usage
- Input validation and sanitization
- Secure file storage for future audio files

## Performance Considerations

- Async background processing to avoid timeouts
- Efficient database queries with proper indexing
- Caching strategies for frequently accessed podcasts
- Optimized frontend rendering for large script content

## Migration History

- `20250916080639_add_analyst_podcast` - Initial podcast model and relationships 