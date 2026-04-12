# Statistics Implementation Plan

Companion to [statistics-plan.md](./statistics-plan.md). This document covers architecture, data pipeline, and step-by-step implementation so that every statistic can be computed once, cached, and imported as a component on any page.

---

## Architecture Decision: Pre-computed Stats in DB

### Why not compute on the fly?

Each statistic requires scanning `GameSession.timeline` JSON across many sessions. Timeline is a JSONB column that can be 5-50KB per session. Aggregating 300+ sessions on every page load means:
- Fetching ~5-15MB of JSON from Postgres per request
- Parsing and reducing in Node.js on every render
- Duplicate computation across pages that show the same chart

### Solution: `GameStats` table + background recomputation

Add a new `GameStats` model that stores pre-computed statistics as JSON. A background job recomputes periodically (e.g., every hour or on-demand after a batch of games completes).

```prisma
model GameStats {
  id           Int      @id @default(autoincrement())
  key          String   @unique @db.VarChar(128)
  data         Json     @default("{}")
  sessionCount Int      @default(0)
  updatedAt    DateTime @updatedAt @db.Timestamptz(6)
}
```

**Key naming convention:**
- `distribution:<gameType>` — Tier 1: per-game-type distribution data (replaces mock)
- `model-comparison:<gameType>` — Tier 2A: per-game metric by model
- `model-winrate:overall` — Tier 2A: cross-game win rate by model
- `discussion-effect:<gameType>` — Tier 2B: with/without discussion comparison
- `leaderboard:overall` — Tier 2C: all participants ranked
- `leaderboard:persona` — Tier 2C: AI personas ranked
- `tag-winrate:overall` — Tier 2D: win rate by persona tag

### Benefits
- Charts load instantly (single row read from `GameStats`)
- Recomputation is decoupled from rendering — can be triggered by cron, admin API, or post-game hook
- Any page can import any stat by key
- Easy to invalidate: just rerun the computation job

---

## Universal Data Schema

### Design principle

The `GameStats.data` JSON uses a **single universal tabular schema** defined by visualization type, not by business purpose. A model win rate chart, a tag win rate chart, and a cooperation-by-round chart all use the same shape — rows × columns of numbers.

The **component** decides how to render (bar chart, line chart, leaderboard table). The schema just holds the data.

### Schema definition

```typescript
// src/app/(game-theory)/lib/stats/types.ts

/** Format hint for rendering numeric values */
type ValueFormat = "percent" | "integer" | "decimal";

/** A column definition — describes one measurable dimension */
interface StatsColumn {
  key: string;            // unique within the dataset, e.g. "claude-haiku-4-5", "winRate", "R1"
  label: string;          // display name, e.g. "Claude Haiku", "Win Rate", "Round 1"
  format?: ValueFormat;   // rendering hint; defaults to "decimal"
}

/** A single row of data */
interface StatsRow {
  label: string;                       // row identifier, e.g. "Round 1", "Persona 42", "risk-averse"
  values: Record<string, number>;      // column key → numeric value
  meta?: Record<string, unknown>;      // optional non-numeric metadata (tags, isHuman, model, avatarUrl, etc.)
}

/** The universal data shape stored in GameStats.data */
interface StatsData {
  columns: StatsColumn[];
  rows: StatsRow[];
}
```

### Why this works for every stat

**Bar chart** (e.g., model win rate across all games):
```json
{
  "columns": [{ "key": "winRate", "label": "Win Rate", "format": "percent" }],
  "rows": [
    { "label": "claude-haiku-4-5", "values": { "winRate": 0.42 } },
    { "label": "gemini-3-flash",   "values": { "winRate": 0.38 } },
    { "label": "gpt-4.1-mini",     "values": { "winRate": 0.35 } }
  ]
}
```

**Grouped bar** (e.g., cooperation rate by round, by model):
```json
{
  "columns": [
    { "key": "claude-haiku-4-5", "label": "Claude Haiku", "format": "percent" },
    { "key": "gemini-3-flash",   "label": "Gemini Flash",  "format": "percent" },
    { "key": "gpt-4.1-mini",     "label": "GPT 4.1 Mini",  "format": "percent" }
  ],
  "rows": [
    { "label": "Round 1", "values": { "claude-haiku-4-5": 0.72, "gemini-3-flash": 0.65, "gpt-4.1-mini": 0.68 } },
    { "label": "Round 2", "values": { "claude-haiku-4-5": 0.58, "gemini-3-flash": 0.51, "gpt-4.1-mini": 0.55 } }
  ]
}
```

**Histogram / distribution** (e.g., beauty contest guess distribution):
```json
{
  "columns": [
    { "key": "ai",    "label": "AI Personas",   "format": "percent" },
    { "key": "human", "label": "Human (Nagel 1995)", "format": "percent" }
  ],
  "rows": [
    { "label": "0-9",   "values": { "ai": 0.05, "human": 0.03 } },
    { "label": "10-19", "values": { "ai": 0.12, "human": 0.08 } },
    { "label": "20-29", "values": { "ai": 0.31, "human": 0.38 } }
  ]
}
```

**Discussion effect** (e.g., side-by-side with/without):
```json
{
  "columns": [
    { "key": "with",    "label": "With Discussion",    "format": "percent" },
    { "key": "without", "label": "Without Discussion",  "format": "percent" }
  ],
  "rows": [
    { "label": "Round 1", "values": { "with": 0.78, "without": 0.62 } },
    { "label": "Round 2", "values": { "with": 0.65, "without": 0.48 } }
  ]
}
```

**Leaderboard** (e.g., persona ranking):
```json
{
  "columns": [
    { "key": "winRate",     "label": "Win Rate",     "format": "percent" },
    { "key": "gamesPlayed", "label": "Games Played", "format": "integer" },
    { "key": "wins",        "label": "Wins",         "format": "integer" }
  ],
  "rows": [
    {
      "label": "Persona 42",
      "values": { "winRate": 0.67, "gamesPlayed": 12, "wins": 8 },
      "meta": { "personaId": 42, "isHuman": false, "tags": ["risk-averse", "analytical"], "model": "claude-haiku-4-5" }
    },
    {
      "label": "Human Player",
      "values": { "winRate": 0.55, "gamesPlayed": 9, "wins": 5 },
      "meta": { "personaId": -1, "isHuman": true, "userId": 7 }
    }
  ]
}
```

### Validation

Use a Zod schema to validate `GameStats.data` before writing to DB:

```typescript
const statsDataSchema = z.object({
  columns: z.array(z.object({
    key: z.string(),
    label: z.string(),
    format: z.enum(["percent", "integer", "decimal"]).optional(),
  })),
  rows: z.array(z.object({
    label: z.string(),
    values: z.record(z.string(), z.number()),
    meta: z.record(z.string(), z.unknown()).optional(),
  })),
});
```

Every stat computation function returns `StatsData`. The recompute orchestrator validates with this schema before writing to DB. Invalid data fails loudly at write time, not silently at render time.

---

## Data Pipeline

### Step 1: Shared aggregation utilities

Create `src/app/(game-theory)/lib/stats/` directory with pure functions that take raw session data and return `StatsData`.

```
src/app/(game-theory)/lib/stats/
├── types.ts                  # StatsData, StatsColumn, StatsRow, ParsedSession
├── aggregate.ts              # Core: load sessions, parse timelines, compute win records
├── distribution.ts           # Tier 1: per-game distributions
├── modelComparison.ts        # Tier 2A: per-game metrics by model
├── modelWinRate.ts           # Tier 2A: cross-game win rate
├── discussionEffect.ts       # Tier 2B: with/without discussion
├── leaderboard.ts            # Tier 2C: persona & overall rankings
├── tagWinRate.ts             # Tier 2D: win rate by persona tag
└── recompute.ts              # Orchestrator: recompute all stats and write to DB
```

### Step 2: `aggregate.ts` — shared data loading

```typescript
// Load all completed sessions for a game type (or all game types)
interface ParsedSession {
  token: string;
  gameType: string;
  personaIds: number[];
  timeline: GameTimeline;
  extra: GameSessionExtra;
}

async function loadCompletedSessions(gameType?: string): Promise<ParsedSession[]>

// Determine winner(s) per session, accumulate win/game records per persona
// Used by: model win rate, leaderboard, tag win rate
interface WinRecord { wins: number; games: number }
function computeWinRecords(sessions: ParsedSession[]): Map<number, WinRecord>
```

This is the only module that touches the DB. All stat functions receive `ParsedSession[]` as input — making them testable and composable.

### Step 3: Stat computation functions

Every function signature:
```typescript
function computeXxx(sessions: ParsedSession[], ...extra): StatsData
```

Returns the universal `StatsData` shape. The recompute orchestrator doesn't need to know what each stat means — it just validates and writes.

### Step 4: `recompute.ts` — orchestrator

```typescript
async function recomputeAllStats(): Promise<{ computed: number; errors: string[] }>
```

Flow:
1. Load all completed sessions once via `loadCompletedSessions()`
2. Load persona metadata (names, tags) once via Prisma
3. Group sessions by gameType
4. Run each stat function → get `StatsData`
5. Validate with `statsDataSchema.parse()`
6. Upsert into `GameStats` by key (Prisma `upsert` on unique `key`)
7. Log timing and any validation errors

### Step 5: Internal API endpoint

```
POST /api/internal/recompute-stats
  → triggers recomputeAllStats()
  → returns { computed, errors, durationMs }
```

Protected by `INTERNAL_API_SECRET`.

### Step 6: Server action for reading stats

```typescript
// src/app/(game-theory)/actions.ts
async function fetchGameStats(key: string): Promise<StatsData | null>
async function fetchGameStatsBatch(keys: string[]): Promise<Record<string, StatsData>>
```

Single-row reads from `GameStats`. Parses `data` JSON back to `StatsData`. Fast enough to call from any server component.

---

## Component Integration

### Existing DistributionView components

Current prop: `{ sessionStats?: GameSessionStats }`

Add a new optional prop:

```typescript
interface DistributionViewProps {
  sessionStats?: GameSessionStats;   // single-session overlay (existing)
  aggregateData?: StatsData;         // pre-computed from GameStats (new)
}
```

Each DistributionView:
- Renders `aggregateData` when available (real data)
- Falls back to hardcoded mock when `aggregateData` is null/undefined
- Overlays `sessionStats` on top (existing "this game" reference line)

### New chart components

Create generic, reusable chart components in `src/app/(game-theory)/components/stats/`:

```
components/stats/
├── StatsBarChart.tsx           # Bar / grouped bar / histogram from StatsData
├── StatsLeaderboard.tsx        # Ranked table from StatsData (uses meta for tags, avatar)
```

These are **visualization-type components**, not purpose-specific. `StatsBarChart` renders any `StatsData` as bars — whether it's model win rates, discussion effects, or tag comparisons. The caller decides layout, title, and which component to use.

Each component:
- Accepts `{ data: StatsData; title?: string; ...layout props }`
- Uses `AcademicChart.tsx` design tokens for visual consistency
- Reads `columns[].format` for value formatting (%, integers, decimals)
- Reads `rows[].meta` for tooltips, badges, avatars in leaderboards

### Usage on any page

```tsx
// Server component
const modelWinRate = await fetchGameStats("model-winrate:overall");
const leaderboard = await fetchGameStats("leaderboard:persona");
const pdDistribution = await fetchGameStats("distribution:prisoner-dilemma");

// Render anywhere
{modelWinRate && <StatsBarChart data={modelWinRate} title="Win Rate by Model" />}
{leaderboard && <StatsLeaderboard data={leaderboard} title="Persona Rankings" />}
{pdDistribution && <PrisonerDilemmaDistributionView aggregateData={pdDistribution} />}
```

---

## Win Rate Computation

Win rate is used across multiple stats (model win rate, leaderboard, tag win rate). Defined once in `aggregate.ts`.

**Winner definition:** participant(s) with the highest cumulative payoff across all rounds in a session. Ties: all tied participants count as winners (consistent with existing `ResultsView` logic).

**Model win rate:** For each model, aggregate wins/games across all personas assigned that model. Normalize per game type so each game contributes equally (win rate within game type, then averaged).

---

## Recomputation Strategy

Stats don't need to be real-time.

**Recommendation:** Hourly cron via internal API. Add `POST /api/internal/recompute-stats` to the same cron schedule as game runs.

Staleness detection: `GameStats.sessionCount` stores how many sessions were included. Pages can compare against current completed count and show "based on N sessions" for transparency.

---

## Migration & Schema Change

Add to `prisma/schema.prisma`:
```prisma
model GameStats {
  id           Int      @id @default(autoincrement())
  key          String   @unique @db.VarChar(128)
  data         Json     @default("{}")
  sessionCount Int      @default(0)
  updatedAt    DateTime @updatedAt @db.Timestamptz(6)
}
```

Run: `npx prisma migrate dev --name add-game-stats`

---

## Implementation Order

### Phase 1: Infrastructure
1. Add `GameStats` model to Prisma schema, run migration
2. Create `src/app/(game-theory)/lib/stats/types.ts` — `StatsData`, `StatsColumn`, `StatsRow`, `ParsedSession`, `statsDataSchema`
3. Create `aggregate.ts` — `loadCompletedSessions()`, `computeWinRecords()`
4. Create `recompute.ts` — orchestrator that validates and upserts
5. Create `POST /api/internal/recompute-stats` endpoint
6. Test: run recompute with empty stat functions, verify DB writes

### Phase 2: Tier 1 — Real distributions
7. Create `distribution.ts` — one compute function per game type, each returns `StatsData`
8. Add `aggregateData?: StatsData` prop to each `DistributionView`
9. Wire up: home page and game results page fetch from `GameStats`
10. Test: verify charts show real data, fall back to mock when insufficient

### Phase 3: Tier 2A — Model comparison
11. Create `modelComparison.ts` — per-game metric by model → `StatsData`
12. Create `modelWinRate.ts` — cross-game win rate by model → `StatsData`
13. Create `StatsBarChart.tsx` — generic bar/grouped-bar component
14. Wire up to recompute pipeline

### Phase 4: Tier 2B — Discussion effect
15. Create `discussionEffect.ts` → `StatsData`
16. Wire up to recompute pipeline (reuses `StatsBarChart.tsx`)

### Phase 5: Tier 2C — Leaderboards
17. Create `leaderboard.ts` — needs Persona table join for names/tags
18. Create `StatsLeaderboard.tsx` — generic ranked table component
19. Wire up to recompute pipeline

### Phase 6: Tier 2D — Tag win rate
20. Create `tagWinRate.ts` → `StatsData`
21. Wire up to recompute pipeline (reuses `StatsBarChart.tsx`)

Each phase is independently shippable. Charts degrade gracefully to mock data when `GameStats` rows don't exist yet.
