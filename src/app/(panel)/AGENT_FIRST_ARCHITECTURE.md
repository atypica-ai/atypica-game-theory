# Panel Agent-First Architecture

## Core Concept

All Panel workflows are **Agent-driven** — the AI Agent executes tool chains in the background, while the frontend renders traditional UI by polling Agent state from `UserChat.messages`.

**User sees**: Forms, buttons, progress bars, cards
**System runs**: Agent → tool calls → messages → frontend polls & renders

## Panel Creation Flow

```
User: Fill description + target size → Extract keywords → Choose mode (Auto/Manual)
  ↓
Agent Chat created with instruction
  ↓
Auto mode:  Agent → searchPersonas → requestSelectPersonas → user confirms → updatePanel
Manual mode: Agent → requestSelectPersonas (empty) → user picks manually → updatePanel
  ↓
Frontend polls fetchPanelCreationProgress(chatToken):
  "searching" → skeleton animation
  "selectingPersonas" → render persona selector (human-in-the-loop)
  "saving" → spinner
  "completed" → success page → auto-redirect to /panel/[id]
```

## Research Creation Flow

```
User: /panel/[panelId]/newstudy → Pick type + question → Submit
  ↓
Step 1 (Setup): User fills research type + question
Step 2 (Confirm): Agent generates plan → confirmPanelResearchPlan tool (human-in-the-loop)
                   User can edit question & execution plan inline, then confirm
Step 3 (Execute): Agent runs discussionChat / interviewChat → auto-redirect to project page
  ↓
Frontend polls fetchResearchWizardProgress(chatToken):
  "creating" → spinner (agent generating plan)
  "confirming" → render editable plan confirmation UI
  "executing" → spinner → redirect to /panel/project/[token]
```

## Key Design Patterns

### Human-in-the-Loop Tools

Tools without `execute()` — frontend renders UI, user submits output:

- `requestSelectPersonas` — persona selector for panel creation
- `confirmPanelResearchPlan` — editable research plan confirmation

### State from Messages

Frontend never stores business state. All status derived from analyzing `UserChat.messages`:

```typescript
// Scan tool calls in messages to determine current step
for (const part of msg.parts) {
  if (toolName === "confirmPanelResearchPlan" && part.state === "input-available")
    → status: "confirming"
  if (toolName === "discussionChat" && part.state === "output-available")
    → status: "completed"
}
```

### Polling Pattern

Frontend polls Server Actions every 3 seconds. No WebSocket needed.

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
/panel/[panelId]/newstudy        → Research wizard (3-step)
/panel/project/[userChatToken]   → Project detail (discussion/interviews)
```
