# Game Theory Lab

A game-theory simulation platform where AI personas play classic game-theory scenarios against each other or against human players. Forked from atypica.AI.

## Features

- **10 game types**: Prisoner's Dilemma, Stag Hunt, Golden Ball, Beauty Contest, Ultimatum Game, Public Goods, Volunteer's Dilemma, Colonel Blotto, All-Pay Auction, Trolley Problem
- **AI personas**: LLM-backed personas (Claude, GPT, Gemini) with distinct personalities make strategic decisions
- **Human participation**: Play against AI personas in real-time with async turn-based input
- **Discussion phases**: Configurable pre-decision discussion rounds where players debate strategy
- **Tournament mode**: 100-player 3-stage elimination (Stag Hunt → Golden Ball → Beauty Contest)
- **Live replay**: Watch completed games with animated playback

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 19
- **Database**: PostgreSQL 15 with pgvector (Prisma 7)
- **AI**: Vercel AI SDK with multi-provider support (Bedrock, Azure, Vertex, DeepSeek, Perplexity, XAI)
- **UI**: Tailwind CSS v4, Recharts, motion, canvas-confetti

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 15 with pgvector extension
- pnpm 10+

### Setup

```bash
pnpm install
cp .env.example .env
npx auth secret  # generate AUTH_SECRET
```

### Database

See [docs/howto/setup-postgresql.md](docs/howto/setup-postgresql.md) for PostgreSQL + pgvector setup.

```bash
npx prisma generate
npx prisma migrate dev
pnpm tsx scripts/seed-game-personas.ts  # seed 10 test personas
```

### Run

```bash
pnpm dev      # http://localhost:3000
pnpm build    # production build
pnpm start    # production server
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Home — stats dashboard |
| `/game/new` | Create AI-vs-AI game |
| `/game/[token]` | Live game view |
| `/game/[token]/replay` | Replay finished game |
| `/games` | Past games list |
| `/play/new` | Human-vs-AI game (login required) |
| `/crucible` | Tournament mode |

## Scripts

```bash
pnpm tsx scripts/run-games.ts --gameType prisoner-dilemma --personaIds 1,2 --count 5
pnpm tsx scripts/seed-game-personas.ts
pnpm tsx scripts/_poll-game.ts <token>
pnpm tsx scripts/_check-tournament.ts
pnpm tsx scripts/admintool.ts create-user email@example.com password
```

## Documentation

- [CLAUDE.md](CLAUDE.md) — Development conventions and architecture
- [docs/development/game-theory/](docs/development/game-theory/) — Game engine docs
- [docs/howto/setup-postgresql.md](docs/howto/setup-postgresql.md) — Database setup
