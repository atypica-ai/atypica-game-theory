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
