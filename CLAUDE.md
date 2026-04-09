# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Game Theory Lab — a focused game-theory simulation platform forked from atypica.AI. AI personas (backed by multiple LLM providers) play classic game-theory scenarios against each other or against human players. The system supports 10 game types, multi-round orchestration with discussion phases, human async participation, replay, and multi-stage tournaments.

## Development Commands

### Essential Commands

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Prisma migrate deploy + Next.js production build
- `pnpm start` - Start production server
- `pnpm test` - Run tests with Vitest
- `pnpm lint` - Run ESLint with zero warnings tolerance
- `pnpm lint:fix` - Auto-fix ESLint errors
- `pnpm format` - Format code with Prettier

### Game Scripts

- `pnpm tsx scripts/run-games.ts --gameType prisoner-dilemma --personaIds 1,2 --count 5 --parallel 2` — Batch game runner
- `pnpm tsx scripts/seed-game-personas.ts` — Seed test personas
- `pnpm tsx scripts/_poll-game.ts <token>` — Poll a running game session
- `pnpm tsx scripts/_check-tournament.ts` — Check tournament state

### Database Operations

- `npx prisma generate` - Generate Prisma client and types
- `npx prisma migrate dev` - Run database migrations in development
- `npx prisma migrate deploy` - Deploy migrations to production

## Architecture

### Tech Stack

- **Frontend**: Next.js 15 with App Router, React 19
- **Database**: PostgreSQL 15 with pgvector extension for persona embeddings
- **AI Models**: Vercel AI SDK with multi-provider support (Bedrock, Azure, Vertex, DeepSeek, Perplexity, XAI)
- **ORM**: Prisma 7 with `@prisma/adapter-pg` (raw pg Pool)
- **Auth**: NextAuth.js (email/password + OAuth)
- **UI**: Tailwind CSS v4, Radix UI (slot only), Recharts, motion, canvas-confetti
- **Search**: Meilisearch for persona discovery
- **Internationalization**: next-intl (zh-CN / en-US)
- **Testing**: Vitest with jsdom

### Game Theory Engine

The core engine lives in `src/app/(game-theory)/` and follows an **event-sourcing** pattern — all game state is an immutable timeline of typed events.

**Game Loop** (`lib/orchestration.ts` / `lib/humanOrchestration.ts`):
1. Create GameSession DB record, atomically transition pending → running
2. Per round: run discussion phase(s) → run decision phase → calculate payoffs
3. Check horizon termination condition; continue or complete
4. Timeline saved to DB after each speaker for live frontend polling

**10 Game Types** (`gameTypes/`):
| Game | Players | Rounds | Key Mechanic |
|------|---------|--------|-------------|
| Prisoner's Dilemma | 2 | 4 | Cooperate/Defect, simultaneous |
| Stag Hunt | 4–10 | 3 | Coordination threshold (40%) |
| Golden Ball | 4–10 | 3 | Split/Steal shared pool |
| Beauty Contest | 2–8 | 1 | Guess 2/3 of median |
| Ultimatum Game | 2 | 1 | Sequential propose/accept |
| Public Goods | 4–10 | 3 | Contribute to multiplied pool |
| Volunteer's Dilemma | 2–10 | 1 | One volunteer needed |
| Colonel Blotto | 2–10 | 1 | Resource allocation across battlefields |
| All-Pay Auction | 2–10 | 1 | All bidders pay, highest wins |
| Trolley Problem | 2–10 | 1 | Ethical diversion decision |

Each game type defines: `rulesPrompt`, `actionSchema` (Zod), `payoffFunction`, `horizon`, `minPlayers/maxPlayers`, `simultaneousReveal`, `discussionRounds`.

**Human Player Support** (`lib/humanOrchestration.ts`):
- Async request/response via timeline events: `human-*-pending` → poll DB → `human-*-submitted`
- 30s timeout with fallback defaults
- Parallel human wait + AI decisions to prevent timeout starvation

**Tournament System** (`tournament/`):
- 3-stage elimination: Stag Hunt (100→20) → Golden Ball (20→4) → Beauty Contest (4→1)
- 1224 competition ranking for fair advancement with ties
- Concurrent group execution within each stage

### Project Structure

```
src/
├── app/
│   ├── (game-theory)/          # Main game-theory feature
│   │   ├── (page)/             # Next.js pages (routes below)
│   │   ├── actions.ts          # Server actions (create/fetch/submit)
│   │   ├── types.ts            # Core types (timeline events, sessions)
│   │   ├── lib/                # Engine: orchestration, phases, persistence, payoff
│   │   ├── gameTypes/          # 10 game definitions (schema, payoff, config)
│   │   └── tournament/         # Multi-stage tournament orchestration
│   ├── (auth)/                 # Authentication (signin, signup, verify)
│   ├── (persona)/              # Persona prompt generation
│   ├── api/
│   │   ├── internal/game-run/          # POST: launch AI game session
│   │   ├── internal/game-run-random/   # POST: launch with random personas
│   │   ├── internal/game-session/[token]/ # GET: fetch session state
│   │   ├── internal/generate-persona/  # POST: generate persona via LLM
│   │   └── health/[apiName]/           # GET: database + LLM health checks
│   ├── layout.tsx              # Root layout
│   └── not-found.tsx / forbidden.tsx
├── ai/
│   ├── provider.ts             # Multi-provider LLM routing (region-aware)
│   ├── usage.ts                # Token usage tracking
│   └── tools/types.ts          # StatReporter type
├── components/                 # UI kit (button, card, input, avatar, theme)
├── lib/                        # Utilities (logging, utils, cipher, proxy, serverAction)
├── prisma/                     # Prisma client, generated types, dbtype.ts
├── search/                     # Meilisearch persona search
└── i18n/                       # next-intl config
scripts/
├── run-games.ts                # Batch game runner (parallel execution)
├── seed-game-personas.ts       # Persona seeder
├── _poll-game.ts               # Session polling utility
├── _check-tournament.ts        # Tournament state checker
└── mock-server-only.ts         # Mocks server-only for CLI scripts
```

### Routes

| Path | Description |
|------|-------------|
| `/` | Home — stats dashboard with game charts |
| `/game/new` | Create AI-vs-AI game session |
| `/game/[token]` | Live game view (activity feed, player cards, rounds, results) |
| `/game/[token]/replay` | Replay finished game with intro animation |
| `/games` | Past games list with filters and pagination |
| `/play/new` | Create human-vs-AI game (authenticated) |
| `/crucible` | Tournament mode (100-player elimination) |

### Database Schema

5 core models + 2 auth-support models in PostgreSQL with pgvector:

- **Team** / **User** — Multi-seat team ownership; User has personal + team-member variants
- **UserProfile** / **VerificationCode** — Auth support (login tracking, email verification)
- **Persona** — AI personas with `halfvec(1024)` embeddings, tier, locale, tags, prompt
- **GameSession** — Game instance: token, gameType, personaIds, timeline (event-sourced JSON), status, extra
- **Tournament** — Multi-stage tournament: state JSON with stages/advancing, status

### AI Provider System (`src/ai/provider.ts`)

Region-aware multi-provider routing via Vercel AI SDK:

- **Amazon Bedrock**: Claude Sonnet 4/4.5, Haiku 4.5
- **Azure OpenAI**: GPT-4o, GPT-5, GPT-4.1, o3-mini
- **Google Vertex**: Gemini 2.5/3.x series
- **DeepSeek**: V3, R1
- **Perplexity**: Sonar Pro
- **XAI**: Grok

Default game models (randomly assigned per persona): `gemini-3-flash`, `gpt-5-mini`

Mainland China routes through Azure/Bedrock/Vertex; global goes direct.

## Code Conventions

### Git Commit Conventions

Only add attribution (co-author) when ALL changes in the commit were written by Claude. If the commit includes user-authored code, use plain commit message without any attribution.

### TypeScript Type Safety

**CRITICAL RULES** — never negotiable:

1. **No `any` types.** Use proper types from AI SDK (`StaticToolResult`, `PrepareStepFunction`, etc.) or the codebase.
2. **No `await import()`.** All imports must be static at file top.
3. **No `eslint-disable` to bypass type errors.** Find the correct types instead.
4. **Study existing patterns before implementing.** Search for similar code with grep before writing new type-heavy code.

### Prisma Imports

The project uses a custom Prisma output path (`src/prisma/generated`):

```typescript
// Correct
import { prisma } from "@/prisma/prisma";
import type { Persona, Prisma } from "@/prisma/client";

// Wrong — don't import from @prisma/client
import { PrismaClient } from "@prisma/client";
```

### Logger Conventions

Pino logger accepts a **single parameter** only:

```typescript
// Correct
logger.info({ msg: "Operation completed", userId: 123 });
logger.error({ msg: "Failed", error: error.message, stack: error.stack });

// Wrong — two parameters
logger.info("Message", { field: value });
```

### Server Actions

- Location: `actions.ts` files within feature directories
- Return type: `ServerActionResult<T>` from `@/lib/serverAction`
- Auth: `withAuth()` wrapper from `@/lib/request/withAuth`

### Styling

- **Tailwind CSS v4** with `oklch` color space
- Use `cn()` from `@/lib/utils` for combining class names
- Theme tokens defined in `src/app/globals.css` via `@theme` block
- Component variants with `class-variance-authority`

### Key Design Patterns

1. **Event Sourcing**: Game state = immutable timeline of typed events (system, discussion, decision, payoff, human-pending/submitted)
2. **Atomic State Transitions**: `startGameSessionRun()` uses conditional SQL UPDATE to prevent races
3. **Background Execution**: `next/server/after()` wraps game runs so they survive after HTTP response
4. **Reasoning Capture**: LLM native reasoning extracted separately from tool/message output, stored per event
5. **`GameType<A>` generic**: Each game defines its action type via Zod schema; payoff function is fully typed

### Environment Setup

Required environment variables:

```env
DATABASE_URL=postgresql://...          # PostgreSQL with pgvector
SHADOW_DATABASE_URL=postgresql://...   # For prisma migrate dev
AUTH_SECRET=...                        # NextAuth.js secret
```

Plus AI provider API keys (Bedrock, Azure, Google Vertex, DeepSeek, etc.) as needed.

### Health Monitoring

Built-in at `/api/health/[apiName]` — supports: `ping`, `database`, `claude`, `gpt`, `gemini`.
