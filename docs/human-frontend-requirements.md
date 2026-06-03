# Human-Involved Game Session — Frontend Requirements
---

## Context: How the Backend Works

The backend is already separated (`lib/humanOrchestration.ts` vs `lib/orchestration.ts`). The timeline is an event-sourced array of typed events polled via SWR every 2s from `fetchGameSession(token)`.

**Key event types the frontend must handle:**

| Event | Written by | Meaning |
|-------|-----------|---------|
| `system` (with `round: N`) | Orchestration | Round announcement |
| `human-discussion-pending` | Orchestration | Player's turn to speak. Has `requestId`, `expiresAt`, `round`. |
| `human-discussion-submitted` | Server action | Player spoke. Has `requestId`, `round`, `content`. |
| `persona-discussion` | Orchestration | Any player spoke (canonical). Has `personaId`, `round`, `content`. |
| `human-decision-pending` | Orchestration | Player's turn to decide. Has `requestId`, `expiresAt`, `round`. |
| `human-decision-submitted` | Server action | Player decided. Has `requestId`, `round`, `content`. |
| `persona-decision` | Orchestration | Any player decided (canonical). Has `personaId`, `round`, `content`. |
| `round-result` | Orchestration | Round complete. Has `round`, `payoffs: Record<number, number>`. |

**Important timing:**
- During discussion: speakers go one-by-one sequentially (shuffled). Each speaker's `persona-discussion` event appears after their LLM call finishes (~2-5s per speaker). Human gets `human-discussion-pending` when it's their turn.
- During decision (parallel games): all AI decisions run in parallel + human gets `human-decision-pending` simultaneously. All `persona-decision` events are batch-written after everyone finishes.
- `human-*-submitted` events written by server actions may be temporarily overwritten by orchestration saves (see `refreshTimeline` pattern in `humanOrchestration.ts`), but are always restored before final save.

**Sentinel:** `HUMAN_PLAYER_ID = -1`. Human is always `participants[0]` in `extra.participants`.

---

## Macro Requirements

### M1: Separate HumanGameView component
Create `HumanGameView/index.tsx` (or similar) that handles the human player game session. The existing `GameView` should detect whether the session has a human player and route to the appropriate view. The human view can share low-level UI primitives (avatar, decision badge, colors) but should own its own state management and layout.

### M2: Phase-aware state derivation
Derive game phase from timeline events. The phase determines what the entire UI shows:
- **Starting**: round system event exists but no player events yet
- **Discussion**: `persona-discussion` or `human-discussion-pending` events present, no decisions yet
- **Decision**: `persona-decision` or `human-decision-pending` events present
- **Reveal**: `round-result` event written for this round
- **Completed**: game status is `completed`

Active round = highest round number in ANY event (including `system` events with `round` field) that doesn't have a `round-result` yet.

### M3: Always show current round immediately
When the game starts or a new round begins, show the round view immediately — never show "Awaiting activity." The active round is known as soon as a `system` event with `round: N` exists. Show player cards in their appropriate phase state.

### M4: Player cards show phase-appropriate status
Each player card's bottom section shows ONE of:
- **Discussion phase**: "Discussing" label for all players
- **Decision phase**: "Deciding" label for undecided players
- **Decided**: decision badge + payoff (after decisions reveal)
- **Idle**: "—" (past rounds, no activity)

No redundant information — don't show discussion message content in cards (it's already visible in the discussion feed below).

### M5: Discussion feed with typing indicator
During live discussion phase, the discussion section should be **auto-expanded** (not collapsed). At the bottom of the message list, show a **typing indicator** for the next speaker: their avatar + animated dots. This tells the player "someone is thinking" and the game isn't frozen.

When no speakers remain (all have spoken), the typing indicator disappears.

### M6: Human input panel
When `human-discussion-pending` or `human-decision-pending` events appear:
- Slide up an input panel at the bottom (existing `HumanInputPanel.tsx` can be reused)
- Panel has countdown timer from `expiresAt`
- Discussion: textarea + send/skip buttons
- Decision: semantic action buttons (enum games) or numeric input (beauty contest)
- On submit: call server action, immediately close panel via `locallySubmittedIds` pattern
- On timeout: auto-submit default

### M7: Round selection for player
- When a new round completes AND a new round starts, the player should **not** be held on the old round (no 2.5s reveal delay for the human player). The player needs to see the current round to act.
- Past rounds are navigable via round pills for review.
- When game completes, show results view.

### M8: Provisional display of human's own actions
After the player submits a discussion message or decision, their card and the discussion feed should reflect it **immediately** (before the next SWR poll). This requires:
- `groupEventsByRound` must synthesize provisional `persona-discussion` / `persona-decision` events from `human-*-submitted` events
- Provisional events must work even when NO canonical events exist yet for that round (create the round entry, don't just add to existing ones)
- When canonical events arrive, they replace provisionals (canonical always wins in dedup by `personaId`)

---

## Minor Requirements

### m1: Phase strip in round header
Next to "Round N" label, show the current phase:
- `Round 1 · Discussion · 2 of 4 spoken`
- `Round 1 · Discussion · Your turn` (when human has pending discussion)
- `Round 1 · Decision · Your move` (when human has pending decision)
- `Round 1 · Decision · Waiting for all players`
- `Round 1 · Starting` (briefly, before first player event)
- `Round 1 · Results`

"Your turn" and "Your move" use `var(--gt-blue)` (the interactive color). Everything else uses `var(--gt-t3)` / `var(--gt-t4)`.

### m2: Decision phase typing indicator (optional)
Similar to discussion typing indicator but for decision phase. Since decisions happen in parallel, this is less useful. A simple "N of M deciding" count below the card grid is sufficient. Or just rely on card status labels ("Deciding").

### m3: Human card visual distinction
Human player card has:
- Dashed border instead of solid
- "YOU" badge on avatar (bottom-right, blue pill)
- Name in `var(--gt-blue)` instead of `var(--gt-t1)`

### m4: Optimistic UI close
When human submits, the input panel closes immediately (don't wait for SWR). Track submitted `requestId`s in local state. `pendingHumanTurn` detection skips events whose `requestId` is in the submitted set.

### m5: SWR polling
Poll `fetchGameSession(token)` every 2s while game is running. Stop when `status === "completed"`.

### m6: Discussion section auto-expand during discussion phase
During live discussion phase, the discussion section should default to expanded. During decision phase or past rounds, it can default to collapsed.

### m7: Score display
Each player card shows cumulative score (all rounds up to currently viewed round). Use player's assigned color for score, `IBMPlexMono` monospace font.

### m8: Results view
When game completes and no manual round is selected, show the results view with winner announcement, confetti, score breakdown. This can reuse the existing `ResultsView.tsx`.

---

## Design System Reference

- Theme: `src/app/(game-theory)/gt-theme.css` — all `--gt-*` CSS variables
- Style guide: `style.md` — arena.ai design essence
- Colors: warm off-white surfaces, 4-level text hierarchy through color only
- Typography: `var(--gt-font-outfit)` for names, `IBMPlexMono` for labels/numbers
- Interactive: `var(--gt-blue)` is the ONLY interactive color
- Badges: `border-radius: 9999px` (pills). Cards: `border-radius: 0.625rem`
- Motion: functional only, not expressive. Minimal transitions.
- Tracking: `-0.025em` for headlines, `0.06em` for uppercase labels

---

## Backend Files to Reference

| File | Purpose |
|------|---------|
| `src/app/(game-theory)/types.ts` | All event types, `HUMAN_PLAYER_ID`, `GameSessionExtra` |
| `src/app/(game-theory)/actions.ts` | `fetchGameSession`, `submitHumanDecision`, `submitHumanDiscussion`, `createHumanGameSession` |
| `src/app/(game-theory)/lib/humanOrchestration.ts` | How the backend orchestrates human games |
| `src/app/(game-theory)/(page)/game/[token]/GameView/HumanInputPanel.tsx` | Existing input panel (reusable) |
| `src/app/(game-theory)/(page)/game/[token]/GameView/PlayerCard.tsx` | Shared player color palette, action styles |
| `src/app/(game-theory)/(page)/game/[token]/GameView/ResultsView.tsx` | Results view (reusable) |
