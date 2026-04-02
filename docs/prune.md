# Codebase Pruning Map

This doc establishes the **ground truth** for pruning: what game-theory actually touches (via static import tracing), and therefore what is safe to delete.

---

## ⚠️ Prerequisite: files that are auto-processed by Next.js

These files are **not imported by game-theory** but are compiled/executed by Next.js automatically on every build or request. Each has import chains into code we want to delete. **All must be edited before any route-group deletions, or the build breaks.**

### 1. `src/app/layout.tsx` — root layout wraps all routes

| Import | Chains into | Action |
|--------|------------|--------|
| `<Embed>` → `(system)/embed/Embed.tsx` | `@/app/(study)/study/actions` | Remove `<Embed>` |
| `generatePageMetadata` → `lib/request/metadata.ts` | `@/lib/attachments/s3` | Remove `generateMetadata` export or inline without S3 |
| `AuthProvider`, `Analytics`, `Stars`, `ThemeProvider`, `Toaster` | Self-contained — no chains into deletable code | Can keep or remove; won't block deletions |

### 2. `src/middleware.ts` — runs on every request

| Import | Chains into | Action |
|--------|------------|--------|
| `@/lib/analytics/tolt` | `src/lib/analytics/tolt.ts` | Remove acquisition tracking block |
| `@/lib/analytics/utm` | `src/lib/analytics/utm.ts` | Same |

Locale handling (`handleLocale`) and `getDeployRegion` are in the required set — keep those.

### 3. `src/i18n/global.ts` — next-intl TypeScript type declaration

**Static imports** of `zh-CN.json` message files from every route group. TypeScript resolves these at build time — if even one JSON file is missing, `pnpm build` fails.

```ts
// Must remove before deleting any of these:
import panelMessages from "../app/(panel)/messages/zh-CN.json";
import studyMessages from "../app/(study)/messages/zh-CN.json";
import sageMessages from "../app/(sage)/messages/zh-CN.json";
// ... 10 more route group message files
```

Strip it down to only `messages/zh-CN.json` (the root messages file), or delete the type augmentation entirely since game-theory doesn't need typed i18n keys.

### 4. `src/i18n/request.ts` — next-intl runtime message loader

Dynamic `import()` calls for all route group message JSONs. These fail at runtime (not build time) when files are missing, but must be cleaned up alongside `global.ts`.

### 5. `src/app/sitemap.ts` — static site map

Static imports from `@/app/(public)/(docs)/`:
```ts
import { docs as faqDocs } from "@/app/(public)/(docs)/faq/docs-config";
import { docs as featureDocs } from "@/app/(public)/(docs)/features/docs-config";
import { docs as guideDocs } from "@/app/(public)/(docs)/guides/docs-config";
```
Delete the entire file or replace with a minimal sitemap covering only `/` and `/game/*`.

### 6. `src/app/not-found.tsx` and `src/app/forbidden.tsx`

Both import `@/components/layout/DefaultLayout` → `GlobalHeader` + `GlobalFooter` (in the deletable `src/components/layout/`). Replace with bare wrappers using only `<NotFound />` / `<Forbidden />` directly.

### 7. `src/app/globals.css`

Contains a PostCSS `@import` resolved at build time:
```css
@import "../components/ai-elements/streamdown.css";
```
Remove this line before deleting `src/components/ai-elements/`.

### 8. `next.config.ts` — no import chains, but references deleted paths

`outputFileTracingIncludes` references `(public)/(docs)` routes. Not a build error, but should be cleaned up after deleting `(public)/`.

---

## Method

A recursive `@/`-alias import tracer was run starting from every file in:
- `src/app/(game-theory)/` (59 files)
- `src/app/api/game/` (1 file: `run/route.ts`)

The tracer followed every `@/` import transitively until the closure was exhausted. The required set below assumes `layout.tsx` has already been stripped of `Embed` and `metadata.ts`.

---

## Required files outside `(game-theory)/`

These 20 files (plus the prisma generated directory) must be kept. Everything else in `src/` is unreachable from game-theory.

| File | Why needed |
|------|-----------|
| `src/ai/provider.ts` | `llm()`, `defaultProviderOptions` |
| `src/ai/usage.ts` | `calculateStepTokensUsage()` |
| `src/ai/v4.ts` | re-exported via `src/prisma/client.ts` |
| `src/ai/tools/types.ts` | `StatReporter`, `AgentToolConfigArgs` |
| `src/ai/tools/readAttachment/prompt.ts` | imported by `personaAgent.ts` |
| `src/ai/prompt/systemConfig.ts` | imported by `personaAgent.ts` |
| `src/app/(persona)/prompt/personaAgent.ts` | base system prompt for persona invocation |
| `src/app/(pulse)/heat/types.ts` | type-only import in `prisma/client.ts` |
| `src/app/(system)/cdn/lib.ts` | `proxiedImageCdnUrl` used by `lib/utils.ts` |
| `src/components/HippyGhostAvatar.tsx` | persona avatars in GameView |
| `src/components/NotFound.tsx` | 404 page for unknown game tokens |
| `src/components/ui/button.tsx` | imported by `NotFound.tsx` |
| `src/lib/logging.ts` | `rootLogger` |
| `src/lib/utils.ts` | `cn()`, `generateToken`, `proxiedImageLoader` |
| `src/lib/proxy/fetch.ts` | imported by `ai/provider.ts` |
| `src/lib/request/deployRegion.ts` | imported by `ai/provider.ts` |
| `src/prisma/client.ts` | Prisma types (`Persona`, `GameSession`, `Tournament`, …) |
| `src/prisma/prisma.ts` | Prisma client singleton |
| `src/search/lib/queries.ts` | `searchPersonas()` for game/new persona picker |
| `src/search/lib/client.ts` | Meilisearch client (relative import from queries) |
| `src/search/types.ts` | Search types (relative import from queries) |

Plus app-level infrastructure that Next.js requires: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/not-found.tsx`, `src/app/(game-theory)/gt-theme.css`.

---

## Safe to bulk-delete: route groups

These route groups have **zero imports from game-theory** (direct or transitive). Deleting an entire directory is safe.

| Directory | Files | Notes |
|-----------|-------|-------|
| `src/app/(agents)/` | 21 | Deep research multi-agent |
| `src/app/(aws)/` | 12 | AWS Marketplace integration |
| `src/app/(deepResearch)/` | 18 | Deep research feature |
| `src/app/(interviewProject)/` | 72 | Interview simulation |
| `src/app/(memory)/` | 29 | Memory system |
| `src/app/(newStudy)/` | 21 | Scout / social media study |
| `src/app/(open)/` | 38 | MCP / open API |
| `src/app/(panel)/` | 74 | Discussion panel (parent of game-theory idea) |
| `src/app/(podcast)/` | 30 | Podcast generation |
| `src/app/(public)/` | 133 | Marketing / landing pages |
| `src/app/(redirect)/` | 5 | URL redirects |
| `src/app/(sage)/` | 68 | Sage research assistant |
| `src/app/(study)/` | 149 | Main study agent (includes `tools/playGame/` — unused by game-theory directly) |
| `src/app/(universal)/` | 40 | Universal agent |
| `src/app/account/` | 27 | User account settings |
| `src/app/admin/` | 86 | Admin dashboard |
| `src/app/blog/` | 9 | Blog |
| `src/app/deck/` | 11 | Deck/presentation feature |
| `src/app/payment/` | 29 | Stripe / Ping++ payment |
| `src/app/team/` | 22 | Team management |
| **Total** | **~954 files** | |

---

## Partial: keep specific files only

These route groups cannot be bulk-deleted because one file within them is in the required set. The rest of the directory is dead weight.

| Keep | Delete everything else in |
|------|--------------------------|
| `src/app/(persona)/prompt/personaAgent.ts` | `src/app/(persona)/` (chat pages, tools, messages, etc.) |
| `src/app/(pulse)/heat/types.ts` | `src/app/(pulse)/` (52 files total, 51 deletable) |
| `src/app/(system)/cdn/lib.ts` | `src/app/(system)/` (CDN proxy routes, embed, etc.) |

> **Simplification option for `(pulse)/heat/types.ts`**: the file only exports `PulsePostData`, which is a JSON-typed extra field on the `Persona` model in `prisma/client.ts`. It can be inlined into `prisma/client.ts` directly (one-line type alias), eliminating the `(pulse)` dependency entirely and allowing `(pulse)/` to be bulk-deleted.

---

## Safe to delete: API routes

| Directory | Notes |
|-----------|-------|
| `src/app/api/format-content/` | Content formatting API |
| `src/app/api/imagegen/` | Image generation API |
| `src/app/api/internal/` | Internal admin APIs |
| `src/app/api/transcribe/` | Audio transcription API |

Keep: `src/app/api/game/` and `src/app/api/health/`.

---

## Safe to delete: shared `src/` libraries

These directories have no files in the required set:

| Directory | Notes |
|-----------|-------|
| `src/ai/tools/experts/` | Expert tools (reasoningThinking, webSearch, etc.) |
| `src/ai/tools/mcp/` | MCP tool integration |
| `src/ai/tools/social/` | Social media tools |
| `src/ai/tools/user/` | User-facing tools (payment, etc.) |
| `src/ai/tools/readAttachment/` | **Except** `prompt.ts` — keep that one file |
| `src/ai/prompt/` | **Except** `systemConfig.ts` — keep that one file |
| `src/ai/messageUtils.ts` | Message conversion utils for study agents |
| `src/email/` | Email sending system |
| `src/lib/analytics/` | Analytics — deletable after removing `<Analytics />` from `layout.tsx` |
| `src/lib/apiKey/` | API key management |
| `src/lib/attachments/` | File attachment + S3 — deletable after removing `metadata.ts` from `layout.tsx` |
| `src/lib/request/metadata.ts` | Page metadata generator — deletable after removing from `layout.tsx` |
| `src/lib/mcp/` | MCP lib |
| `src/lib/proxy/` | **Except** `fetch.ts` — keep that one file |
| `src/lib/request/` | **Except** `deployRegion.ts` — keep that one file |
| `src/lib/tokens/` | Token accounting |
| `src/lib/userChat/` | UserChat utilities |
| `src/tokens/` | Token billing system |
| `src/components/ai-elements/` | AI chat UI components |
| `src/components/chat/` | Chat UI components |
| `src/components/layout/` | Layout components |
| `src/components/SelectPersonaDialog/` | Persona picker (only needed if game/new uses it — verify) |
| `src/hooks/` | Mostly study/chat hooks — audit individually |

---

## Execution order

1. **Edit all 6 auto-processed files** (prerequisites — none of the deletions below are safe until these are done):
   - `src/app/layout.tsx` — remove `<Embed>`, remove `generateMetadata`/`metadata.ts`
   - `src/middleware.ts` — remove acquisition tracking, keep only locale handling
   - `src/i18n/global.ts` — strip to root messages only (or delete type augmentation)
   - `src/i18n/request.ts` — strip to root messages only
   - `src/app/sitemap.ts` — replace with minimal game-theory sitemap
   - `src/app/not-found.tsx` — remove `DefaultLayout` wrapper
   - `src/app/forbidden.tsx` — remove `DefaultLayout` wrapper
   - `src/app/globals.css` — remove `@import "../components/ai-elements/streamdown.css"`
   - `next.config.ts` — remove `outputFileTracingIncludes` for `(public)/(docs)`
2. **Bulk-delete route groups** (safe after step 1)
3. **Partial cleanup**: keep the 3 individual files, delete rest of `(persona)/`, `(pulse)/`, `(system)/`
4. **Shared lib pruning**: delete the dirs listed above; audit `src/lib/request/` and `src/hooks/` individually
5. **Schema pruning** (separate stage — requires migration): drop unused Prisma models

---

## Summary

| Category | File count |
|----------|-----------|
| Game-theory feature itself | ~60 |
| Required files outside game-theory | ~21 |
| **Deletable (route groups)** | **~954** |
| Deletable (API routes) | ~4 dirs |
| Deletable (shared libs, partial) | ~200+ |
| Prisma schema (separate stage) | — |

---

## Execution Log

All stages below were executed sequentially. Each stage ended with a clean `pnpm build` before proceeding.

---

### Stage 0 — Prerequisite edits (auto-processed files)

**Logic**: Next.js compiles certain files regardless of whether game-theory routes import them. These files had import chains into deletable code, so they had to be edited first. Only after all 9 edits were complete could any bulk deletion begin.

**Files edited and changes made**:

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Removed `<Embed>` (→ `(system)/embed`), `<AuthProvider>` (→ `(auth)`), `<Stars>`, `<Analytics>` (→ `lib/analytics`), `generatePageMetadata` (→ `lib/request/metadata` → `lib/attachments/s3`). Replaced with static `metadata` export. Kept `ThemeProvider`, `NextIntlClientProvider`, `Toaster`, fonts. |
| `src/middleware.ts` | Removed tolt/utm acquisition tracking (→ `lib/analytics`), removed maintenance mode check (→ `lib/request/maintenance`). Kept locale handling, ping handler, security headers. |
| `src/i18n/global.ts` | Stripped 10+ route-group JSON imports. Kept only root `messages/zh-CN.json`. TypeScript resolves these statically — any missing JSON = immediate build failure. |
| `src/i18n/request.ts` | Simplified `getMessages` to only load root locale JSON files (`messages/zh-CN.json`, `messages/en-US.json`). Removed per-route-group message merging. |
| `src/app/sitemap.ts` | Replaced with minimal 2-URL sitemap (`/` and `/game/new`). Old version imported docs-config from `(public)/(docs)/`. |
| `src/app/not-found.tsx` | Removed `DefaultLayout` wrapper (→ `components/layout`). Now just `<NotFound />` directly. |
| `src/app/forbidden.tsx` | Same as not-found — removed `DefaultLayout`. |
| `src/app/globals.css` | Removed `@import "../components/ai-elements/streamdown.css"` (PostCSS resolves `@import` at build time). |
| `next.config.ts` | Removed `outputFileTracingIncludes` for `(public)/(docs)` routes. |

**Verification**: `pnpm build` clean after all 9 edits. ✓

---

### Stage 1 — Bulk route group deletion

**Logic**: With all prerequisite files edited, the 20 safe route groups had no remaining import chains from kept code. All could be bulk-deleted in one pass.

**Deleted**:
```
src/app/(agents)/
src/app/(aws)/
src/app/(deepResearch)/
src/app/(interviewProject)/
src/app/(memory)/
src/app/(newStudy)/
src/app/(open)/
src/app/(panel)/
src/app/(podcast)/
src/app/(public)/
src/app/(redirect)/
src/app/(sage)/
src/app/(study)/
src/app/(universal)/
src/app/account/
src/app/admin/
src/app/blog/
src/app/deck/
src/app/payment/
src/app/team/
src/app/api/format-content/
src/app/api/imagegen/
src/app/api/internal/
src/app/api/transcribe/
```

**Partial deletions** (kept one file each):
- `src/app/(persona)/` — deleted everything except `prompt/personaAgent.ts` (game-theory imports it for persona invocation system prompt)
- `src/app/(pulse)/` — deleted everything; `heat/types.ts` was the only kept file, but `PulsePostData` type was inlined into `prisma/client.ts` to eliminate the dependency entirely
- `src/app/(system)/` — deleted everything except `cdn/lib.ts` (provides `proxiedImageCdnUrl` used by `lib/utils.ts`)

**Verification**: `pnpm build` clean after deletions. ✓

---

### Stage 2 — Shared library pruning

**Logic**: After route deletions, many files in `src/ai/`, `src/lib/`, `src/components/`, etc. were no longer reachable. Prerequisite: simplify `src/ai/tools/types.ts` first (it had relative imports into `./experts/` and `./user/` for `BasicUITools`).

**Prerequisite edit**:
- `src/ai/tools/types.ts` — removed `BasicUITools`, `GenericInputType`, and the relative imports that referenced `./experts/` and `./user/`. Kept `StatReporter`, `AgentToolConfigArgs`, `PlainTextToolResult`, `PlainTextUITools`, `TMessageWithPlainTextTool`, `BasicToolName`.

**Deleted**:
```
src/ai/embedding.ts
src/ai/messageUtils.ts
src/ai/tools/experts/
src/ai/tools/mcp/
src/ai/tools/readAttachment/   (all except prompt.ts — kept)
src/ai/tools/social/
src/ai/tools/user/
src/ai/prompt/                 (all except systemConfig.ts — kept)
src/email/
src/lib/analytics/
src/lib/apiKey/
src/lib/attachments/
src/lib/mcp/
src/lib/proxy/                 (all except fetch.ts — kept)
src/lib/request/               (all except deployRegion.ts and headers.ts — kept)
src/lib/tokens/
src/lib/userChat/
src/tokens/
src/components/ai-elements/
src/components/chat/
src/components/layout/
src/hooks/
src/sandbox/
src/types/
```

**Note**: `src/search/` was kept — game-theory `/game/new` uses Meilisearch persona search.

**Verification**: `pnpm build` failed with:
```
./src/app/api/health/[apiName]/route.ts
Module not found: Can't resolve '@/ai/embedding'
Module not found: Can't resolve '@/ai/tools/social'
Module not found: Can't resolve '@/email/lib'
Module not found: Can't resolve '@/ai/tools/experts/webSearch'
```

`api/health/` was in the "keep" list but its 200-line handler tested social tools, email, embedding, and webSearch — all deleted. Fixed by replacing with a minimal handler (ping, database, LLM only). ✓

**Second build failure** — `src/prisma/dbtype.ts` imported from `(panel)/types`, `(persona)/types`, `(sage)/types`, `(study)/context/types`, `../tokens/types` — all deleted. Fixed by removing those imports and their corresponding `PrismaJson` type declarations (panel discussion, sage, study context, tokens log resource types). ✓

**Third build failure** — `scripts/**/*.ts` is included in `tsconfig.json`, so TypeScript checks all scripts at build time. Several script files imported deleted modules:
- `scripts/admin/admintool.ts` → `@/app/(auth)/lib`, `@/app/team/lib`, `@/app/payment/manualSubscription` — deleted `scripts/admin/` entirely
- `scripts/utils/create-aws-test-user.ts` → `@/app/(auth)/lib` — deleted
- `scripts/utils/payment-stats-v2.ts` → payment modules — deleted
- `scripts/utils/payment-stats.ts` → `../../src/tokens/types` — deleted
- `scripts/utils/extract-persona-attributes.ts` → `@/app/(persona)/lib` — deleted
- `scripts/utils/rescore-personas.ts` → `@/app/(persona)/lib` — deleted
- `scripts/archive/**/*.ts` → various deleted modules — deleted `scripts/archive/` entirely
- `scripts/dumps/**/*.ts` → `@/app/(interviewProject)/types` — deleted `scripts/dumps/` entirely

**DistributionView lint failures** — 3 modified `DistributionView.tsx` files (goldenBall, prisonerDilemma, stagHunt) had `_props: { sessionStats?: GameSessionStats }` parameters declared but never used. Removed the unused parameter and the now-unused `GameSessionStats` import. ✓

**Final `pnpm build` output** (clean):
```
Route (app)                Size   First Load JS
/                         17.7 kB  239 kB
/_not-found                137 B   103 kB
/api/game/run              137 B   103 kB
/api/health/[apiName]      137 B   103 kB
/game/[token]              142 B   311 kB
/game/[token]/replay       142 B   311 kB
/game/new                 4.31 kB  126 kB
/manifest.json               0 B     0 B
/robots.txt                137 B   103 kB
/sitemap.xml               137 B   103 kB
```

✓ All 10 expected routes present. Build clean.

---

---

### Stage 3 — i18n messages cleanup

**Logic**: `messages/zh-CN.json` and `messages/en-US.json` had 13 top-level keys. A `grep` of all kept source files for `useTranslations`/`getTranslations` found only two callers:
- `src/components/NotFound.tsx` → `"NotFoundPage"`
- `src/components/Forbidden.tsx` → `"ForbiddenPage"`

All other keys (`FeaturedStudiesPage`, `ScoutPage`, `PaymentPage`, `Components`, `Maintenance`, `NewStudyChatPage`, `FileUploadLimits`, `MemoryBuilder`, `MyPodcastsPage`, `Archive`) were deleted from both locale files. Both files reduced from 468 lines to ~14 lines each.

**Verification**: `pnpm build` clean. ✓

---

### Stage 4 — package.json dependency pruning

**Method**: Scanned all kept source files for npm package imports; compared against `package.json`. Removed all packages with no remaining callers in `src/` or `scripts/`.

**Packages removed from `dependencies`**:
```
@ai-sdk/anthropic       @ai-sdk/mcp              @ai-sdk/openai
@ai-sdk/react           @aws-sdk/client-marketplace-entitlement-service
@aws-sdk/client-marketplace-metering               @aws-sdk/s3-request-presigner
@dnd-kit/core           @dnd-kit/sortable         @dnd-kit/utilities
@google-analytics/data  @hookform/resolvers        @modelcontextprotocol/sdk
@next/third-parties     @radix-ui/react-accordion  @radix-ui/react-alert-dialog
@radix-ui/react-avatar  @radix-ui/react-checkbox   @radix-ui/react-collapsible
@radix-ui/react-dialog  @radix-ui/react-dropdown-menu  @radix-ui/react-label
@radix-ui/react-popover @radix-ui/react-progress   @radix-ui/react-radio-group
@radix-ui/react-select  @radix-ui/react-separator  @radix-ui/react-slider
@radix-ui/react-switch  @radix-ui/react-tabs       @radix-ui/react-tooltip
@radix-ui/react-use-controllable-state             @segment/analytics-next
@segment/analytics-node @smithy/node-http-handler  @stripe/stripe-js
@tavily/core            @types/ws                  @vercel/functions
bash-tool               bcryptjs                   d3-hierarchy
date-fns                dotenv                     framer-motion
google-auth-library     groq-sdk                   hpagent
jose                    js-cookie                  js-yaml
jszip                   just-bash                  motion
music-metadata          next-auth                  nodemailer
plyr                    plyr-react                 qrcode.react
react-day-picker        react-hook-form            react-markdown
remark-gfm              rss-parser                 shiki
sns-validator           streamdown                 stripe
use-debounce            uuid                       vaul
ws                      zustand
```

**Packages removed from `devDependencies`**:
```
@types/nodemailer  @types/sns-validator  socket.io-client
```

**Scripts section**: Removed `admintool` and `analytics` entries (both referenced deleted `scripts/admin/` files).

**Kept `@aws-sdk/client-s3`**: `scripts/utils/public-assets.ts` uploads static assets to S3; script is still present.

**Only 1 Radix UI package kept**: `@radix-ui/react-slot` (used by `src/components/ui/button.tsx`). All other Radix UI components were dropped with the deleted chat/layout/study UI.

**Verification**: `pnpm build` clean (packages still in node_modules; pruning takes effect on next `pnpm install`). ✓

---

---

### Stage 5 — Prisma schema pruning + new database

**Method**: Rewrote `prisma/schema.prisma` from 1049 lines to ~120 lines, keeping only the 5 models game-theory needs. Squashed all 23 prior migrations into a single clean init. Created a dedicated `game_theory_dev` database.

**Models deleted** (~35 removed): `Memory`, `UserChat`, `UserChatMessage`, `Analyst`, `AnalystReport`, `InterviewProject`, `InterviewSession`, `Subscription`, `PaymentRecord`, `TokensAccount`, `TokensAccountDeposit`, `ApiKey`, `BlogArticle`, `Podcast`, `ResearchTemplate`, `ScoutTask`, `PanelSession`, `Pulse`, `SageTopic`, `SagePost`, `AgentSkill`, `AwsMarketplaceEntitlement`, `ReportTemplate`, `AgentStatistics`, `PersonaImport`, `ResearchReport`, and all their enums.

**Models kept**: `Team`, `User`, `Persona`, `GameSession`, `Tournament`.

**`Persona` schema changes**: Removed `scoutUserChatId` and `personaImportId` FK fields (referenced deleted models). All related back-relations removed from `User` and `Team`.

**`src/prisma/dbtype.ts`**: Stripped from 15 type declarations to 5 — only `TeamExtra`, `PersonaExtra`, `GameSessionTimeline` (= `GameTimeline`), `TournamentState`, `Locale`. Aliased `TournamentState` import as `TournamentStateType` to avoid name collision with the namespace declaration.

**Migration squash steps**:
1. Deleted all 23 migration folders (`find ./prisma/migrations -mindepth 1 -maxdepth 1 -type d -exec rm -rf {} +`)
2. Created `prisma/migrations/20260402000000_init/` with SQL generated via `prisma migrate diff --from-empty --to-schema`
3. Manually replaced the auto-generated B-tree embedding index with the correct HNSW index (`USING hnsw ("embedding" halfvec_cosine_ops) WITH (m = 16, ef_construction = 64)`)
4. Applied SQL directly to new DB, then ran `prisma migrate resolve --applied 20260402000000_init`

**New database**: Created `game_theory_dev` and `game_theory_dev_shadow` in the existing Docker PostgreSQL container (`postgres-atypica`). The project no longer shares the `atypica_dev_v2` database.

**Persona data import**: Imported 10 game personas from `game-personas.sql` dump. The dump contained stale columns (`scoutUserChatId`, `personaImportId`) — handled by temporarily adding them during import, then dropping them after. `userId` values referencing non-existent users were nulled out.

**Type errors surfaced by `prisma generate`** (all fixed):
- `scripts/_poll-game.ts`: `GameTimeline as Record<string,unknown>[]` → cast through `unknown`
- `src/app/(game-theory)/lib/persistence.ts`: `timeline as object[]` → removed cast (type already correct)
- `src/app/(game-theory)/tournament/lib/persistence.ts`: `state as object` → removed cast
- `src/app/(game-theory)/tournament/lib/launch.ts`: `state: {}` → `state: { stages: [] }` (required field)

**Verification**: `pnpm build` clean. ✓

**New `.env` DB config**:
```env
DATABASE_URL=postgresql://atypica:atypica@localhost:5432/game_theory_dev
SHADOW_DATABASE_URL=postgresql://atypica:atypica@localhost:5432/game_theory_dev_shadow
```
