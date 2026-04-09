# Repository Guidelines

This document helps contributors make effective, consistent changes to the Game Theory Lab codebase.

## Project Structure & Module Organization

- `src/app/(game-theory)/` (App Router): Game engine, pages, server actions, game types, tournament system.
- `src/app/(auth)/`: Authentication (signin, signup, verify, password reset).
- `src/app/(persona)/`: Persona prompt generation for AI personas.
- `src/app/api/`: Internal API routes (game-run, game-session, health checks).
- `src/ai/`: Multi-provider LLM routing, token usage tracking.
- `src/components/`, `src/lib/`: UI kit (Radix/Tailwind), shared utilities.
- `src/prisma/`: Prisma client wrapper (`prisma.ts`); do not edit generated client in `src/prisma/generated/`.
- `prisma/`: Schema and migrations.
- `scripts/`: Game runner, persona seeder, admin tools.
- `docs/`, `public/`: Documentation and static assets.

## Build, Test, and Development Commands

- Install deps: `pnpm install`
- Env setup: `cp .env.example .env && npx auth secret`
- Prisma types/migrations: `npx prisma generate` · `npx prisma migrate dev`
- Dev server (Turbopack): `pnpm dev`
- Build/Start: `pnpm build` · `pnpm start`
- Tests (Vitest/jsdom): `pnpm test`
- Lint/Format: `pnpm lint` · `pnpm lint:fix` · `pnpm format`
- Game scripts: `pnpm tsx scripts/run-games.ts`, `pnpm tsx scripts/seed-game-personas.ts`

## Coding Style & Naming Conventions

- Formatting: Prettier; 2-space indent, LF, UTF-8 (`.editorconfig`, `.prettierrc`).
- Linting: ESLint `next/core-web-vitals` + TypeScript (`eslint.config.mjs`). No warnings in CI.
- TypeScript everywhere; prefer explicit types on public APIs.
- Naming: PascalCase React components; camelCase variables/functions; kebab-case file names; hooks start with `use*`.
- Imports: use path alias `@/…` for `src/`. Avoid deep relative chains.

## Testing Guidelines

- Framework: Vitest with `jsdom` (see `vitest.config.mts`).
- Location: `__tests__/` and co-located `*.test.ts(x)` allowed.
- Conventions: test observable behavior; mock network/Prisma where needed.
- Run locally: `pnpm test`. Add tests for new features and bug fixes.

## Commit & Pull Request Guidelines

- Commits: follow Conventional Commits — `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`; optional scope, imperative mood.
- PRs: clear description, linked issues, screenshots for UI, steps to verify, and migration notes if Prisma changes. Include tests and docs updates.

## Security & Configuration Tips

- Never commit secrets; use `.env` based on `.env.example`.
- Database URLs required for Prisma; `postinstall` runs `prisma generate`.
- When changing schema, include migration and note rollout steps.
