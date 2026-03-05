# Panel Agent-First Architecture

## Core Concept

All Panel workflows are **Agent-driven** — the AI Agent executes tool chains while the frontend streams real-time state via `useChat`. No polling needed.

**User sees**: Forms, buttons, progress bars, cards
**System runs**: Agent → tool calls → streamed messages → frontend derives status & renders

## Execution Modes

### Panel Creation: Always Sync

Panel creation uses `executionMode: "sync"` throughout:

- The agent lifecycle is tied to the HTTP connection
- Dialog close / page refresh → `req.signal` aborts → agent stops → `runId` cleared in DB
- When the user re-opens, they can safely trigger a new execution (regenerate/continue) without a stale agent running in the background
- **No polling needed** — the frontend always has the real-time stream

Why sync works: every step is short (search → select → save). Once `updatePanel` completes, the dialog redirects.

### Research Project: Dynamic (Sync → Background)

Research projects use a **dynamic executionMode** via `executionModeRef`:

- **Plan phase** (regenerate/continue): `"sync"` — agent stops when page closes, safe to re-trigger on next visit. Every step before discussion is short.
- **After confirm** (addToolResult → sendMessage): `undefined` — agent runs in background so discussion/interview continues even if user refreshes. On re-open, check `runId` to avoid duplicate execution.

```typescript
const executionModeRef = useRef<"sync" | undefined>("sync");

// In addToolResult (after user confirms plan):
executionModeRef.current = undefined; // switch to background
useChatRef.current.sendMessage();     // agent continues in background
```

Why dynamic: discussion/interview execution is long-running (minutes). If sync, closing the tab would abort mid-discussion. Background mode lets the agent finish even if the user navigates away.

## Panel Creation Flow

```
User: Fill description → Choose mode (Auto/Manual)
  ↓
createPanelViaAgent: creates UserChat with instruction (does NOT execute agent)
  ↓
Frontend: useChat → setMessages(initialMessages) → regenerate()
  → POST /api/chat/universal (executionMode: "sync")
  → Agent streams: searchPersonas → requestSelectPersonas (human-in-the-loop) → updatePanel
  ↓
Frontend derives status from streamed messages:
  "searching" → spinner + real-time agent text
  "selectingPersonas" → persona selector (addToolResult + sendMessage to continue)
  "saving" → spinner + real-time agent text
  "completed" → success → auto-redirect to /panel/[id]
```

## Research Project Flow

```
User: /panel/[panelId] → Pick type + question → Submit
  ↓
createUniversalAgentFromPanel: creates UserChat with instruction (does NOT execute agent)
  → redirect to /panel/project/[token]
  ↓
Project Detail Page loads → fetch messages → determine view:

  Has discussion/interview data? → Results View (SWR polls discussion/interview data)
  No data yet? → Agent View:
    - Check runId: if agent already running in background, skip trigger
    - Last message is user msg → regenerate(sync)
    - Last message is assistant msg → sendMessage(CONTINUE, sync)
    - Agent streams: plan → confirmPanelResearchPlan (human-in-the-loop)
    - User confirms → addToolResult switches executionMode to background
    - Agent continues: discussionChat/interviewChat → generateReport (background)
    ↓
  Once discussionChat/interviewChat tool call appears → switch to Results View
  (useChat connection stays alive; agent stream continues in parallel)
```

## Key Design Patterns

### Human-in-the-Loop Tools

Tools without `execute()` — frontend renders UI, user submits output via `addToolResult`:

- `requestSelectPersonas` — persona selector for panel creation
- `confirmPanelResearchPlan` — editable research plan confirmation

### State from Messages (Frontend)

Frontend never stores business state. All status derived from scanning `messages` in reverse:

```typescript
function deriveStatus(messages) {
  for (const part of latestParts) {
    if (toolName === "updatePanel" && state === "output-available") → "completed"
    if (toolName === "requestSelectPersonas" && state === "input-available") → "selectingPersonas"
    if (toolName === "searchPersonas") → "searching"
  }
}
```

### Real-time Agent Activity

During waiting states (searching, saving), the dialog shows the agent's latest activity:
- Text output → last ~80 characters of agent text
- Tool execution → `exec searchPersonas`, `exec updatePanel`

### Sync Lifecycle (Panel Creation + Project Plan Phase)

```
regenerate(sync) ──→ POST /api/chat/universal
                       ↓
              executeUniversalAgent(requestAbortSignal: req.signal)
                       ↓
              AbortSignal.any([managedRunSignal, requestAbortSignal])
                       ↓
              streamText({ abortSignal: combinedSignal })
                       ↓
              Page close → req.signal abort → agent stops → runId cleared
```

### Background Lifecycle (Project Execution Phase)

```
sendMessage(undefined) ──→ POST /api/chat/universal (no executionMode)
                             ↓
              executeUniversalAgent(requestAbortSignal: req.signal)
                             ↓
              AbortSignal uses only managedRunSignal (not req.signal)
                             ↓
              Page close → stream stops but agent keeps running in background
                             ↓
              Re-open page → check runId → skip trigger → SWR polls results
```

## Persona Display

Extra fields shown based on `role` (role itself is not displayed):

| Role | Fields |
|------|--------|
| consumer | ageRange, location, title |
| buyer | title, industry, organization |
| expert | title, industry, organization, experience |

All personas use `HippyGhostAvatar` component with `seed={persona.id}`.

## Routes

```
/panels                          → Panel list (create + manage)
/panel/[panelId]                 → Panel detail (personas + projects)
/panel/project/[userChatToken]   → Project detail (discussion/interviews)
```
