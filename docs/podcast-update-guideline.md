I understand your requirement! You want to add a podcast generation feature to the analyst page that mirrors the existing report generation functionality. Let me first read through all the files in the analyst directory to understand the current implementation, then provide a detailed implementation plan.
Read file: /Users/tezign/Documents/PRJ/Fork/atypica-llm-app/src/app/analyst/actions.ts
Read file: /Users/tezign/Documents/PRJ/Fork/atypica-llm-app/src/app/analyst/layout.tsx
Read file: /Users/tezign/Documents/PRJ/Fork/atypica-llm-app/src/app/analyst/page.tsx
Read file: /Users/tezign/Documents/PRJ/Fork/atypica-llm-app/src/app/analyst/AnalystsList.tsx
Ran tool
Now let me read the files in the `[id]` directory to understand the individual analyst page structure:
Read file: /Users/tezign/Documents/PRJ/Fork/atypica-llm-app/src/app/analyst/[id]/page.tsx
Read file: /Users/tezign/Documents/PRJ/Fork/atypica-llm-app/src/app/analyst/[id]/AnalystDetail.tsx
Read file: /Users/tezign/Documents/PRJ/Fork/atypica-llm-app/src/app/analyst/[id]/actions.ts
Read file: /Users/tezign/Documents/PRJ/Fork/atypica-llm-app/src/app/analyst/[id]/AnalystInterviewsSection.tsx
Now let me check the current database schema to understand the AnalystReport structure:
Ran tool
Read file: /Users/tezign/Documents/PRJ/Fork/atypica-llm-app/prisma/schema.prisma
Let me also check the Analyst model to see its relationship with reports:
Ran tool
Read file: /Users/tezign/Documents/PRJ/Fork/atypica-llm-app/prisma/schema.prisma
Perfect! Now I have a complete understanding of the current implementation. Let me provide you with a detailed implementation plan for adding the podcast generation feature.

## Implementation Plan for Analyst Podcast Feature

### Understanding of Current Implementation

I've analyzed the current analyst page structure and understand:

1. **Current Architecture**:
   - `AnalystReportsSection.tsx` handles report generation with customizable prompts
   - Uses `backgroundGenerateReport` action for async report generation
   - Reports are stored in `AnalystReport` table with fields: `token`, `instruction`, `coverSvg`, `onePageHtml`, `generatedAt`
   - Reports are displayed in a grid with SVG covers and generation status indicators
   - Uses `TokenAlertDialog` for token consumption warnings

2. **Current Database Schema**:
   - `Analyst` model has `reports: AnalystReport[]` relationship
   - `AnalystReport` has standard fields for content generation

### Detailed Implementation Plan

#### 1. Database Schema Changes

**Add new `AnalystPodcast` model** in `prisma/schema.prisma`:

```prisma
model AnalystPodcast {
  id          Int       @id @default(autoincrement())
  token       String    @unique @db.VarChar(64)
  analystId   Int       @db.Integer
  analyst     Analyst   @relation(fields: [analystId], references: [id])
  instruction String    @db.Text
  script      String    @db.Text        // The generated podcast script (very long text)
  podcastUrl  String?   @db.VarChar(500) // URL to generated audio file
  generatedAt DateTime? @db.Timestamptz(6)
  extra       Json      @default("{}")

  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)
}
```

**Update `Analyst` model** to include podcast relationship:
```prisma
model Analyst {
  // ... existing fields ...
  interviews    AnalystInterview[]
  reports       AnalystReport[]
  podcasts      AnalystPodcast[]     // Add this line
  featuredStudy FeaturedStudy?
}
```

#### 2. Create Migration
- Run `npx prisma migrate dev --name add_analyst_podcast` to create the migration

#### 3. Backend Actions Implementation

**Update `/src/app/analyst/[id]/actions.ts`** with new functions:

```typescript
// Add new function for fetching podcasts (similar to fetchAnalystReports)
export async function fetchAnalystPodcasts({
  analystId,
}: {
  analystId: number;
}): Promise<ServerActionResult<(Pick<AnalystPodcast, "id" | "token" | "analystId" | "generatedAt" | "createdAt" | "updatedAt"> & { analyst: Analyst })[]>>

// Add new function for generating podcasts (similar to backgroundGenerateReport)
export async function backgroundGeneratePodcast({
  analystId,
  instruction = "",
  systemPrompt,
}: {
  analystId: number;
  instruction?: string;
  systemPrompt?: string;
}): Promise<void>
```

#### 4. AI Tool Implementation

**Create new AI tool for podcast generation** in `/src/ai/tools/experts/`:
- Create `/src/ai/tools/experts/podcastGeneration/` directory
- Implement similar structure to report generation but optimized for podcast script format
- Add podcast-specific prompt templates in `/src/ai/prompt/podcast/`

#### 5. Component Implementation

**Create `AnalystPodcastsSection.tsx`** in `/src/app/analyst/[id]/`:
- Mirror the structure of `AnalystReportsSection.tsx`
- Key differences:
  - Display podcast scripts instead of HTML reports
  - Show audio generation status and audio player when available
  - Custom prompt dialog for podcast-specific instructions
  - Grid layout showing podcast script previews instead of SVG covers

**Update `AnalystDetail.tsx`**:
- Add podcast section below or alongside reports section
- Import and integrate the new `AnalystPodcastsSection` component
- Pass podcast data and default prompt system

#### 6. Page Integration

**Update `/src/app/analyst/[id]/page.tsx`**:
- Add `fetchAnalystPodcasts` call
- Add podcast-specific prompt system (similar to `defaultReportHTMLSystem`)
- Pass podcast data to `AnalystDetail` component

#### 7. Prompt System

**Create podcast prompt templates** in `/src/ai/prompt/`:
- Create `podcastScript.ts` with locale-specific prompts
- Design prompts optimized for conversational, audio-friendly content
- Include instructions for proper pacing, transitions, and audio cues

#### 8. UI Components Structure

**Expected component hierarchy**:
```
AnalystDetail.tsx
├── AnalystReportsSection.tsx (existing)
└── AnalystPodcastsSection.tsx (new)
    ├── Podcast grid display
    ├── Generate podcast button
    ├── Podcast prompt dialog
    └── TokenAlertDialog for generation
```

#### 9. File Structure

**New files to create**:
```
/src/app/analyst/[id]/
├── AnalystPodcastsSection.tsx

/src/ai/tools/experts/podcastGeneration/
├── index.ts
├── tool.ts
└── implementation.ts

/src/ai/prompt/podcast/
├── podcastScript.ts
└── index.ts

/prisma/migrations/
└── [timestamp]_add_analyst_podcast/
    └── migration.sql
```

**Files to modify**:
```
/prisma/schema.prisma
/src/app/analyst/[id]/page.tsx
/src/app/analyst/[id]/AnalystDetail.tsx
/src/app/analyst/[id]/actions.ts
/src/ai/tools/tools.ts
/src/ai/prompt/index.ts
```

#### 10. Implementation Considerations

**Key Design Decisions**:
1. **Reuse Report Generation Pattern**: Follow the exact same async generation pattern as reports for consistency
2. **Token System**: Use similar token cost structure as reports (adjustable via `TokenAlertDialog`)
3. **URL Storage**: `podcastUrl` field can be initially null, populated later when audio generation is implemented
4. **Script Length**: Use `@db.Text` for unlimited script length
5. **Status Indicators**: Similar loading/completed states as reports
6. **Grid Layout**: Display script previews instead of SVG covers

**Technical Implementation Notes**:
- Use the same background processing pattern (`backgroundWait`, `waitUntil`)
- Implement similar error handling and logging
- Maintain consistent UI/UX patterns with existing report section
- Ensure proper TypeScript types throughout the chain

### Questions for Approval

1. **Database Structure**: Is the proposed `AnalystPodcast` model structure acceptable? Any additional fields needed?
**User:** Approved.

2. **UI Layout**: Should podcasts be displayed in a separate section below reports, or in a tabbed interface alongside reports?
**User:** below.

3. **Generation Flow**: Should podcast generation follow the exact same pattern as reports (background generation with status polling)?
**User:** Exactly the same

4. **Audio Integration**: For the initial implementation, should we focus only on script generation and leave audio file generation (`podcastUrl`) for a future iteration?
**User:** yes, leave it for next iteration.

5. **Prompt Defaults**: Should I create a basic placeholder prompt system now, or would you prefer to implement the complex prompts yourself after the infrastructure is ready?
**User:** create a placeholder now.