# Repository Guidelines

This document helps contributors make effective, consistent changes to atypica-llm-app.

## Project Structure & Module Organization

- `src/app/` (App Router): feature groups in route segments `(study)`, `(agents)`, `(persona)`, `(interviewProject)`, `(auth)`; API routes live here too.
- `src/ai/`: LLM tools, message utilities, agent logic.
- `src/components/`, `src/hooks/`, `src/lib/`: UI, hooks, shared utilities and configs.
- `src/prisma/`: Prisma client wrapper (`prisma.ts`); do not edit generated client in `src/prisma/client/`.
- `prisma/`: schema and seeds (`prisma/seed.ts`).
- `__tests__/`: Vitest unit/integration tests.
- `scripts/`: maintenance tools (`admintool.ts`, `analytics-report.ts`).
- `docs/`, `public/`: documentation and static assets.

## Build, Test, and Development Commands

- Install deps: `pnpm install`
- Env setup: `cp .env.example .env && npx auth secret`
- Prisma types/migrations: `npx prisma generate` · `npx prisma migrate dev`
- Dev server (Turbopack): `pnpm dev`
- Build/Start: `pnpm build` · `pnpm start`
- Tests (Vitest/jsdom): `pnpm test`
- Lint/Format: `pnpm lint` · `pnpm lint:fix` · `pnpm format`
- Admin tools: `pnpm admintool …` (see `scripts/admintool.ts`)

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
- When changing schema, include migration + seed updates, and note rollout steps.
