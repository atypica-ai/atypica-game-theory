# Atypica 2.0 — `/v2`

## File Structure

```
src/app/(public)/v2/
├── page.tsx                    # Entry
├── HomeV43Page.tsx             # Main page (sticky nav + IntersectionObserver × 2)
├── HomeV43.module.css          # Minimal (keyframes/filter/mask-image/mode-card only)
├── content.ts                  # All copy, data, image prompts
├── components/
│   ├── ChapterPanel.tsx        # Dark/light panel wrapper (variant prop)
│   └── SystemStageHUD.tsx      # Fixed bottom-right live metrics widget
├── sections/
│   ├── HeroSection.tsx         # Full-width, abstract bg
│   ├── TwoWorldsSection.tsx    # 01 - Kahneman quote + Objective vs Subjective (large type contrast)
│   ├── WorldModelSection.tsx   # 02 - Foundation Model + 4-layer dataset + cross-layer gap
│   ├── TwoAgentsSection.tsx    # 03 - AI Simulator + AI Researcher with animated mockups
│   ├── ThreeModesSection.tsx   # 04 - Use Cases × Workflow (left selector + right interactive demos)
│   ├── DataAssetsSection.tsx   # 05 - Dark panel, 3 showoff stat cards (Persona/Sage/Panel)
│   ├── UseCasesSection.tsx     # 06 - Solutions: 8 role cards + customer stories
│   ├── LogoWall.tsx            # Infinite scroll logo wall (between chapters & closing)
│   ├── ClosingSection.tsx      # Full-width CTA
│   └── ScrollBackground.tsx    # Global fixed bg image switching (skips hero)
└── docs/                       # Design docs
    ├── content-plan.md
    ├── design-decisions.md
    └── design-reference.md
```

## Chapter Structure

| # | Nav Label | Section | Variant |
|---|-----------|---------|---------|
| 01 | Worlds | Two Worlds: "Objective" / "Subjective" as big titles | dark |
| 02 | Model | Foundation Model: kicker + "Subjective World Model" title + 4-layer dataset + cross-layer gap | dark |
| 03 | Agents | AI Simulator (2C/2B/Expert) \| AI Researcher (6 research forms) | dark |
| 04 | Workflow | Use Cases × Workflow: left selector (8 goals) + right interactive demos | dark |
| 05 | Assets | Data Assets: 3 showoff stat cards (Persona/Sage/Panel) | dark |
| 06 | Solutions | 8 role cards + customer stories below | light |

## Layout Architecture

- Page background: `#09090b` (zinc-950)
- Constrained width `max-w-[1400px]` centered
- Chapters area: flex layout — left sticky nav (`w-40`, hidden on mobile) + right content
- Hero and Closing are full-width, outside chapters area
- LogoWall sits between chapters and Closing
- `ScrollBackground`: fixed bg layer at z-1, images fade with chapter switching
- `SystemStageHUD`: fixed bottom-right widget with 5 product metrics (high-frequency pseudo-random values)
- Each chapter wrapped in `ChapterPanel` — dark (zinc-900) or light (#fafaf8), **no border-radius**

## Color System

All colors use Tailwind zinc scale tokens — **no raw `white/xx` or `black/xx` opacity values**.

- Dark sections: `text-zinc-300`, `border-zinc-800`, `bg-zinc-900`
- Light sections: `text-zinc-500`, `border-zinc-200`, `bg-[#fafaf8]`
- Brand green: `#1bff1b` (opaque, no transparency, black text on buttons)
- Brand green hover: `#15b025`
- Light-bg green: `#15b025` (darker variant for readability)
- World Model ring colors: `#16a34a`, `#3b82f6`, `#d97706`, `#8b5cf6`
- Workflow demo light theme: `#f5f3ef` base, `#eceae4` sub-bg
- Font sizes: Tailwind responsive classes (`text-3xl lg:text-4xl xl:text-5xl`), minimum `text-xs` (12px), no `clamp()`

## Animated Mockups

All functional sections use code-based animated UI mockups (no static images):

- **SimulatorMockup** (03): 3-step progress (Parse→Analyze→Generate) + persona card reveal with dimension bars
- **ResearcherMockup** (03): Live interview chat with typing indicators, sliding window (max 3 messages)
- **Workflow Demos** (04): 3 mock shell types — MockStudyUI (split chat+console), MockInterviewUI (focused persona chat), MockSignalUI (dashboard). 8 use cases × 3 steps each, click-triggered auto-cycling, light theme, TypeText animation, page-slide transitions

## Solutions Section (06)

- **Role Cards**: 4×2 grid, 8 roles (6 existing + Researcher + Investor) with scenario-based imagegen prompts
- **Customer Stories**: 4 stories with 4 distinct presentation styles:
  1. Chart-driven (bar chart + quote)
  2. Product mockup (CAD wireframe + feedback bubbles)
  3. Process pipeline (numbered horizontal flow)
  4. Technical/code (dark code panel + quote)
- Small selector cards with imagegen profile avatars
- Large story card: `rounded-xl`, `min-h-[280px]`

## Tech Stack

- **Tailwind CSS v4** for all styles (CSS Module only for keyframes/filter/mask-image/mode-card)
- **framer-motion** for animations (AnimatePresence, motion.div, useScroll/useTransform)
- **Next.js Image** for generated images via `/api/imagegen/dev/`
- **cn()** from `@/lib/utils` for conditional classes
- **next-intl** for i18n — `useTranslations("HomeAtypicaV2")`, all text in `messages/{en-US,zh-CN}.json`
- Prefer Tailwind standard utilities over arbitrary px values

## Clients

Mars, Bosch, Lenovo, Fonterra, Ant Group, Huawei, L'Oréal, WPP, Proya

## Known Issues / TODOs

- GlobalFooter color doesn't match page bg — need `v2/layout.tsx` with `className="!bg-[#09090b]"`
- Nav highlighting: uses separate IntersectionObserver from bg scene tracking
- DefaultLayout `overflow-y-auto` fix in HomeV43Page (traverses parent elements)
- HomeV43Page.tsx / HomeV43.module.css still use "V43" naming — consider renaming to "V2"
