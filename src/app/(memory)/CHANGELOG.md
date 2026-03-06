# Memory System Changelog

Concise log of changes that affect how memory is loaded or reorganized across agents. If you own an agent that uses memory, check this file when updating the memory module.

---

## Loading: Combined Team + User Memory (with labels)

**Summary:** When a user has both team and personal memory, agents now receive **both** in one string, with clear section labels. Previously, callers chose either team memory or user memory, not both.

### API changes (`lib/loadMemory.ts`)

| Symbol | Change |
|--------|--------|
| `loadMemoryForAgent(userId, teamId?)` | **New.** Returns combined memory: optional "Team Memory:\n" block + optional "User Personal Memory:\n" block. Order: team first, then user. Empty sections omitted. |
| `TEAM_MEMORY_LABEL` | **New.** `"Team Memory:\n"` (exported). |
| `USER_PERSONAL_MEMORY_LABEL` | **New.** `"User Personal Memory:\n"` (exported). |
| `loadUserMemory(userId)` | Unchanged. Still returns user core+working only. |
| `loadTeamMemory(teamId)` | Unchanged. Still returns team memory only. |

### Call sites that now use the new loading behavior

| Functionality / Agent | File | Change |
|------------------------|------|--------|
| **Universal agent** (main chat) | `src/app/(universal)/agent.ts` | Replaced `teamId ? loadTeamMemory(teamId) : loadUserMemory(userId)` with `loadMemoryForAgent(userId, teamId)`. |
| **Study agent** (research flows) | `src/app/(study)/agents/baseAgentRequest.ts` | Replaced `loadUserMemory(userId)` with `loadMemoryForAgent(userId, baseContext.teamId)`. |

### Call sites that still use the old loaders (unchanged)

| Functionality | File | Loader used |
|---------------|------|-------------|
| Account capabilities (fetch/edit user memory) | `src/app/account/capabilities/actions.ts` | `loadUserMemoryWithMetadata(userId)` |
| Personal template generation | `src/app/(newStudy)/lib/template.ts` | `loadUserMemory(userId)` (intentionally user-only). |

If you add or own another agent that should see both team and user memory when available, switch it to `loadMemoryForAgent(userId, teamId)` and add an entry above.

---

## Reorganization logic (brief)

- **Active path:** `reorganizeMemoryWithCore(coreMemory, workingMemory, logger)` in `lib/reorganizeMemory.ts` (v2).
  - Cross-references current **core** and **working**.
  - Promotes permanent, identity-level items from working into core (and can edit existing core entries).
  - Returns updated **core** only; working is cleared by the caller (`updateMemory.ts`).
  - Prompt: `prompt/memoryReorganizeV2.ts`.
- **Deprecated:** `reorganizeMemoryContent(currentContent, logger)` (v1) only cleaned working memory and did not touch core. Do not use for new code.

---

*Last updated: 2025-03 (loading: combined team+user with labels; reorg: v2 summary).*
