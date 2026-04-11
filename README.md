# Game Theory Lab

**Do LLMs cooperate, defect, bluff, and betray the way humans do?**

Game Theory Lab is an open experimental platform that puts AI personas — backed by Claude, GPT, Gemini, DeepSeek, and others — into classic game-theory scenarios against each other and against human players, then measures what happens.

Every decision is recorded. Every reasoning trace is captured. Every round is replayable. The result is a growing behavioral dataset that lets researchers compare LLM strategic behavior against decades of published human experimental data.

---

## Why This Exists

Behavioral game theory has 50+ years of controlled human experiments — Prisoner's Dilemma cooperation rates, Beauty Contest depth-of-reasoning distributions, Ultimatum Game fairness norms. These are some of the most replicated results in social science.

LLMs now make strategic decisions in the real world: negotiating, allocating resources, advising on cooperation and competition. But we don't have systematic empirical data on *how* they behave in the same controlled settings humans have been tested in for decades.

This platform closes that gap. Same payoff matrices. Same rules. Same information structures. Different players.

---

## What You Can Do

### Run AI-vs-AI Experiments

Launch any of 10 game types with AI personas. Each persona is assigned a random LLM provider (Claude, GPT, Gemini) to ensure behavioral diversity isn't an artifact of a single model family. Watch decisions unfold in real time with full reasoning traces.

### Play Against AI

Authenticate and step into any game yourself. The async human participation system gives you 30 seconds per decision — AI opponents continue in parallel so nobody waits. Your choices are recorded alongside AI decisions for direct comparison.

### Run Tournaments

The **Crucible** is a 3-stage elimination tournament: 100 AI personas enter, 1 survives.

| Stage | Game | Field | Advance |
|-------|------|-------|---------|
| 1 | Stag Hunt | 100 | 20 |
| 2 | Golden Ball | 20 | 4 |
| 3 | Beauty Contest | 4 | 1 |

Eliminations are permanent. The tournament tests coordination under pressure (Stage 1), trust and betrayal in shrinking groups (Stage 2), and pure strategic reasoning in the final (Stage 3).

### Compare Against Human Baselines

The dashboard overlays AI persona behavior against published human experimental results — the same payoff matrices, the same round structures, cited to specific papers:

- **Prisoner's Dilemma**: Dal Bo & Frechette (2011), AER — cooperation decay across 4 rounds
- **Beauty Contest**: Nagel (1995) — depth-of-reasoning distribution
- **Public Goods**: Fehr & Gachter (2000) — contribution and free-riding rates
- **Ultimatum Game**: Guth et al. (1982) — fairness norm distributions

---

## 10 Game Types

| Game | Players | Rounds | What It Tests |
|------|---------|--------|---------------|
| **Prisoner's Dilemma** | 2 | 4 | Cooperation vs. defection under temptation |
| **Stag Hunt** | 4-10 | 3 | Coordination when trust is required |
| **Golden Ball** | 4-10 | 3 | Split-or-steal: greed vs. collective gain |
| **Beauty Contest** | 2-8 | 1 | Depth of strategic reasoning (level-k) |
| **Ultimatum Game** | 2 | 1 | Fairness norms in sequential bargaining |
| **Public Goods** | 4-10 | 3 | Free-rider problem and contribution norms |
| **Volunteer's Dilemma** | 2-10 | 1 | Diffusion of responsibility |
| **Colonel Blotto** | 3-8 | 3 | Resource allocation across battlefields |
| **All-Pay Auction** | 2-10 | 1 | Overbidding and winner's curse dynamics |
| **Trolley Problem** | 2-10 | 1 | Moral reasoning under group observation |

Each game type defines its own Zod-validated action schema, payoff function, discussion rounds, and termination horizon. Adding a new game is a single directory with four files.

---

## Architecture

The engine follows an **event-sourcing** pattern — all game state is an immutable timeline of typed events. No mutable state, no race conditions, full auditability.

```
GameSession.timeline = [
  { type: "system",           round: 1, ... }
  { type: "persona-discussion", personaId: 42, content: "I think we should...", reasoning: "..." }
  { type: "persona-decision",   personaId: 42, action: { choice: "cooperate" }, reasoning: "..." }
  { type: "round-result",      round: 1, payoffs: { 42: 51, 17: 51 } }
  ...
]
```

Key design decisions:

- **Reasoning capture**: LLM native reasoning (chain-of-thought) is extracted separately from the decision output and stored per event — enabling analysis of *why* a persona cooperated or defected, not just *that* it did.
- **Multi-provider diversity**: Personas are randomly assigned across model families (Claude Haiku, Gemini Flash, GPT-4.1-mini) so behavioral patterns reflect LLM tendencies broadly, not one model's personality.
- **Atomic state transitions**: Game sessions use conditional SQL updates to prevent duplicate runs — critical when background execution survives HTTP response boundaries.
- **Async human integration**: Human players participate via timeline events (`human-*-pending` / `human-*-submitted`) with 30s timeouts and fallback defaults, keeping AI players unblocked.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router), React 19 |
| Database | PostgreSQL 15 + pgvector (persona embeddings) |
| ORM | Prisma 7 with raw pg adapter |
| AI | Vercel AI SDK — Bedrock, Azure, Vertex, DeepSeek, XAI |
| Auth | NextAuth.js |
| Search | Meilisearch (persona discovery) |
| UI | Tailwind CSS v4, Recharts, Motion, canvas-confetti |
| i18n | next-intl (zh-CN / en-US) |
| Testing | Vitest + jsdom |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL 15 with pgvector extension

### Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and AI provider keys

# Run database migrations
npx prisma migrate dev

# Seed test personas
pnpm tsx scripts/seed-game-personas.ts

# Start development server
pnpm dev
```

### Run a Game from CLI

```bash
# Run 5 Prisoner's Dilemma games with personas 1 and 2, 2 in parallel
pnpm tsx scripts/run-games.ts \
  --gameType prisoner-dilemma \
  --personaIds 1,2 \
  --count 5 \
  --parallel 2
```

### Environment Variables

```env
DATABASE_URL=postgresql://...          # PostgreSQL with pgvector
SHADOW_DATABASE_URL=postgresql://...   # For prisma migrate dev
AUTH_SECRET=...                        # NextAuth.js secret
```

Plus API keys for your chosen AI providers (Bedrock, Azure, Vertex, DeepSeek, XAI).

---

## Project Structure

```
src/
├── app/
│   ├── (game-theory)/          # Core game engine
│   │   ├── gameTypes/          # 10 game definitions (schema, payoff, rules, charts)
│   │   ├── lib/                # Orchestration, phases, persistence, payoff calc
│   │   ├── tournament/         # Multi-stage elimination system
│   │   └── (page)/             # Routes: home, game view, replay, crucible
│   ├── (persona)/              # Persona prompt generation
│   └── api/internal/           # Game launch, session polling, health checks
├── ai/                         # Multi-provider LLM routing
├── prisma/                     # Schema, migrations, generated client
└── scripts/                    # CLI tools: batch runner, seeder, polling
```

---

## Routes

| Path | What It Does |
|------|--------------|
| `/` | Dashboard — game cards with AI-vs-human distribution charts |
| `/game/new` | Launch an AI-vs-AI game session |
| `/game/[token]` | Live game view with activity feed, player cards, round navigation |
| `/game/[token]/replay` | Replay a finished game with intro animation |
| `/games` | Browse past games with filters and pagination |
| `/play/new` | Join a game as a human player (authenticated) |
| `/crucible` | Tournament arena — 100-player elimination |

---

## Research Applications

This platform is designed for empirical investigation. Some questions it enables:

- **Cooperation dynamics**: Do LLMs exhibit the end-game defection cascade documented in human Prisoner's Dilemma experiments?
- **Level-k reasoning**: How deep do different model families reason in Beauty Contest games? Do they converge to Nash equilibrium faster than human subjects?
- **Fairness norms**: Do LLMs trained on human text inherit human-like fairness preferences in Ultimatum Games, or do they play the game-theoretic optimum?
- **Cross-model variation**: When the same persona prompt runs on Claude vs. GPT vs. Gemini, how much does strategic behavior diverge?
- **Discussion effects**: Does pre-decision discussion change cooperation rates? Does cheap talk work on LLMs the way it works on humans?
- **Persona influence**: How much does a persona's described background (risk-averse accountant vs. aggressive trader) shift their actual game-theoretic behavior?

---

## Development

```bash
pnpm dev          # Development server (Turbopack)
pnpm build        # Production build (runs migrations first)
pnpm test         # Vitest
pnpm lint         # ESLint (zero warnings)
pnpm format       # Prettier
```

---

## License

MIT
