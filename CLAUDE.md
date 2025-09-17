# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

atypica.AI is a business research AI agent framework that uses multi-agent collaboration to understand subjective business factors like consumer emotions, market perceptions, and decision preferences. The system models consumer personalities through AI agents and captures behavior through interactions.

## Development Commands

### Essential Commands

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build the application for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests with Vitest
- `pnpm lint` - Run ESLint with zero warnings tolerance
- `pnpm lint:fix` - Auto-fix ESLint errors
- `pnpm format` - Format code with Prettier

### Admin and Utility Scripts

- `pnpm admintool` - Run admin management tools (`tsx scripts/admintool.ts`)
- `pnpm analytics` - Generate analytics reports (`tsx scripts/analytics-report.ts`)

### Database Operations

- `npx prisma generate` - Generate Prisma client and types
- `npx prisma migrate dev` - Run database migrations in development
- `npx prisma migrate deploy` - Deploy migrations to production

## Architecture

### Tech Stack

- **Frontend**: Next.js 15 with App Router, React 19
- **Database**: PostgreSQL 15 with pgvector extension for embeddings
- **AI Models**: Multiple providers supported (Claude, GPT-4, Google, Azure, etc.)
- **ORM**: Prisma with Accelerate and Read Replicas extensions
- **Auth**: NextAuth.js
- **UI**: Radix UI components with Tailwind CSS v4
- **Internationalization**: next-intl
- **Testing**: Vitest with jsdom

### Core Multi-Agent System

The system uses specialized AI agents that collaborate on research tasks:

1. **Study Agent** (`src/app/(study)/`) - Orchestrates research workflows and guides users
2. **Scout Agent** (`src/app/(newStudy)/`) - Discovers and categorizes target user groups
3. **Interviewer Agent** (`src/app/(interviewProject)/`) - Conducts professional interviews
4. **Persona Agent** (`src/app/(persona)/`) - Simulates user responses and provides feedback

### Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (study)/           # Main research assistant functionality
│   ├── (agents)/          # Multi-agent answer system
│   ├── (persona)/         # User persona library and chat
│   ├── (interviewProject)/# Interview simulation system
│   ├── (newStudy)/        # User discovery and scouting
│   ├── (auth)/            # Authentication system
│   ├── (public)/          # Public marketing pages
│   ├── account/           # User account management
│   ├── admin/             # Admin dashboard
│   ├── analyst/           # Research analyst tools
│   ├── api/               # API routes
│   └── payment/           # Payment and subscription system
├── ai/                    # AI service layer
│   ├── prompt/            # AI prompt templates
│   ├── tools/             # AI tool definitions and implementations
│   ├── provider.ts        # Multi-provider AI client configuration
│   └── messageUtils.ts    # Message processing utilities
├── components/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── i18n/                  # Internationalization setup
├── lib/                   # Utility functions and configurations
├── prisma/                # Database client and utilities
└── types/                 # TypeScript type definitions
```

### Key AI Tools

The system provides specialized AI tools located in `src/ai/tools/`:

- **reasoningThinking** - Deep analysis and reasoning
- **interview** - Automated interview management
- **scoutTaskChat** - User discovery and persona building
- **generateReport** - Research report generation

### Database Schema

Core entities include:

- **User/Team** - User management with team support
- **Persona** - AI personas with vector embeddings for similarity search
- **UserChat** - Conversation sessions with different kinds (scout, study, interview, etc.)
- **Analyst** - Research analysts conducting studies
- **InterviewProject/Session** - Interview simulation system
- **TokensAccount** - Usage tracking and billing
- **Subscription/PaymentRecord** - Subscription and payment management

### Environment Setup

Required environment variables:

- `DATABASE_URL` and `SHADOW_DATABASE_URL` for PostgreSQL
- `AUTH_SECRET` for NextAuth.js (generate with `npx auth secret`)
- AI provider API keys for various LLM services
- Payment provider credentials (Stripe, Ping++)
- Optional: Uptime Kuma monitoring integration

### Testing Strategy

- Uses Vitest with jsdom environment
- Next-intl inline dependency configuration for testing
- Test files should follow standard patterns

### Development Notes

- The codebase uses pnpm with specific build dependencies optimization
- PostgreSQL must have pgvector extension installed for persona embeddings
- Uses Prisma's preview features for PostgreSQL extensions
- Supports both personal users and team-based usage
- Implements comprehensive token usage tracking and subscription management
- Admin tools available for user management and system monitoring

### Health Monitoring

Built-in health check system available at `/api/health` with:

- Database connectivity checks
- LLM model availability testing
- System status monitoring
- Optional Uptime Kuma integration

Run health checks with: `npx tsx scripts/check-status.ts`
