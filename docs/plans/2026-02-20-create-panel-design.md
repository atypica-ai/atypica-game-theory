# Design: Panel Creation via Agent

## Problem

Users cannot create Panels from the `/panels` list page. The "New Panel" card currently links to `/sage` (wrong destination). Users need a way to:

1. Describe what kind of personas they want
2. Get AI-recommended personas
3. Manually adjust the selection (add/remove)
4. Confirm and create the Panel

## Solution: Agent + Human-in-the-Loop Tool

Reuse the Universal Agent with a new `createPanel` tool that follows the `requestInteraction` pattern — no server-side `execute()`, frontend handles user interaction via `addToolResult`.

## Flow

```
/panels → click "New Panel"
  → create UserChat(kind: universal)
  → navigate to /universal/{token}
  → user types research need (e.g. "25-35岁职场女性的消费决策")
  → Agent calls searchPersonas → gets candidate personas
  → Agent calls createPanel tool with recommended personaIds
  → Frontend renders interactive persona selector UI
  → User reviews pre-selected personas, can add/remove via search
  → User clicks confirm
  → Server action creates PersonaPanel, returns panelId
  → addToolResult sends panelId back to Agent
  → Agent continues (can suggest starting research, etc.)
```

## New Components

### 1. `createPanel` Tool

Location: `src/app/(study)/tools/createPanel/`

```typescript
// No execute() — human-in-the-loop pattern (same as requestInteraction)
export const createPanelTool = tool({
  description: "Create a reusable persona panel from recommended personas. Presents an interactive UI for the user to review, add, or remove personas before confirming.",
  inputSchema: z.object({
    title: z.string().describe("Suggested panel title based on persona characteristics"),
    personaIds: z.array(z.number()).min(1).describe("Recommended persona IDs from search results"),
    instruction: z.string().optional().describe("Research context or purpose for this panel"),
  }),
  outputSchema: z.object({
    panelId: z.number(),
    personaIds: z.array(z.number()),
    title: z.string(),
    plainText: z.string(),
  }),
  toModelOutput: (result) => ({
    type: "text",
    value: result.plainText,
  }),
});
```

### 2. `CreatePanelMessage` Frontend Component

Location: `src/app/(study)/tools/createPanel/CreatePanelMessage.tsx`

States (matching requestInteraction pattern):
- **`input-streaming`**: Loading state while Agent generates recommendation
- **`input-available`**: Interactive UI — pre-selected personas + search/add + confirm button
- **`output-available`**: Read-only display with link to `/panel/{panelId}`

UI layout:
```
┌─────────────────────────────────────────────┐
│  Create Panel: "{title}"                    │
│                                             │
│  Selected Personas (N):                     │
│  [✕ Amy] [✕ Bob] [✕ Carol] [✕ David] ...   │
│                                             │
│  [+ Add More Personas]  ← opens SelectPersonaDialog
│                                             │
│  [Confirm & Create Panel]                   │
└─────────────────────────────────────────────┘
```

On confirm:
1. Call server action `createPersonaPanelFromTool({ userId, personaIds, title, instruction })`
2. Receive `panelId`
3. Call `addToolResult({ output: { panelId, personaIds, title, plainText } })`

### 3. Server Action

Location: `src/app/(panel)/(page)/panels/actions.ts` (add to existing file)

```typescript
export async function createPersonaPanelFromTool(params: {
  personaIds: number[];
  title?: string;
  instruction?: string;
}): Promise<ServerActionResult<{ panelId: number }>>
```

Uses existing `createPersonaPanel` from `src/app/(panel)/lib/persistence.ts`. If title is provided, skip auto-generation.

### 4. Entry Point Change

File: `src/app/(panel)/(page)/panels/PanelsListClient.tsx`

Change "New Panel" card from `<Link href="/sage">` to a button that:
1. Calls a server action to create `UserChat(kind: universal)`
2. Navigates to `/universal/{token}`

## Tool Registration

Add `createPanel` to `UniversalToolSet` in `src/app/(universal)/tools/`:
- Add to `UniversalToolName` enum
- Add to tool set in `src/app/(universal)/agent.ts`
- Add frontend rendering in Universal Agent's tool UI dispatcher

## What We Reuse

- `SelectPersonaDialog` component (for manual persona addition)
- `createPersonaPanel` + `generatePersonaPanelTitle` from persistence.ts
- Universal Agent infrastructure (UserChat, streaming, tool handling)
- `requestInteraction` pattern (no execute, addToolResult, 3-state rendering)
- `fetchPersonasWithMeili` for persona search in the dialog

## What's New

- `createPanel` tool definition + schema
- `CreatePanelMessage` frontend component
- Server action for tool-triggered panel creation
- Entry point change on `/panels` page
- i18n keys for the new UI
