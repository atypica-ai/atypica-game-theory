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
│   ├── HeroSection.tsx         # Full-width, abstract bg (V4-2 subjective world prompt)
│   ├── TwoWorldsSection.tsx    # 01 - Kahneman quote + Measurable vs Emotional (large type contrast)
│   ├── TwoAgentsSection.tsx    # 02 - Simulator + Researcher with animated mockups
│   ├── WorldModelSection.tsx   # 03 - Light panel, 4-layer concentric rings + right panel (no boxes)
│   ├── ThreeModesSection.tsx   # 04 - Signal treemap / Deep workflow / Live interview mockups
│   ├── DataAssetsSection.tsx   # 05 - Dark panel, typography-driven horizontal bands (no cards)
│   ├── UseCasesSection.tsx     # 06 - Light panel, scenario map + 4 customer stories
│   ├── LogoWall.tsx            # Infinite scroll logo wall (between chapters & closing)
│   ├── ClosingSection.tsx      # Full-width CTA
│   └── ScrollBackground.tsx    # Global fixed bg image switching (skips hero)
└── docs/                       # Design docs (screenshots moved elsewhere)
    ├── content-plan.md
    ├── design-decisions.md
    └── design-reference.md
```

## Layout Architecture

- Page background: `#09090b` (zinc-950)
- Constrained width `max-w-[1400px]` centered
- Chapters area: flex layout — left sticky nav (`w-40`, hidden on mobile) + right content
- Hero and Closing are full-width, outside chapters area
- LogoWall sits between chapters and Closing
- `ScrollBackground`: fixed bg layer at z-1, images fade with chapter switching
- `SystemStageHUD`: fixed bottom-right widget with live metrics (sin wave animation + clock)
- Each chapter wrapped in `ChapterPanel` — dark (zinc-900) or light (#fafaf8), **no border-radius**

## Color System

All colors use Tailwind zinc scale tokens — **no raw `white/xx` or `black/xx` opacity values**.

- Dark sections: `text-zinc-300`, `border-zinc-800`, `bg-zinc-900`
- Light sections: `text-zinc-500`, `border-zinc-200`, `bg-[#fafaf8]`
- Brand green: `#1bff1b` (opaque, no transparency, black text on buttons)
- Brand green hover: `#15b025`
- Light-bg green: `#15b025` (darker variant for readability)
- World Model ring colors: `#16a34a`, `#3b82f6`, `#d97706`, `#8b5cf6`
- Font sizes use Tailwind responsive classes (`text-3xl lg:text-4xl xl:text-5xl`), no `clamp()`

## Section Dark/Light Distribution

| Section | Variant | Notes |
|---------|---------|-------|
| Hero | dark | Full-width, abstract bg (V4-2 subjective world prompt) |
| 01 Two Worlds | dark | Large Kahneman quote + Measurable vs Emotional contrast |
| 02 Two Agents | dark | Animated mockups: persona building + interview chat |
| 03 World Model | **light** | No wrapper boxes, rings + right panel directly on bg |
| 04 Three Modes | dark | Signal treemap, Deep Brief/Intent/Execute, Live focused chat |
| 05 Data Assets | **dark** | Typography-driven, hero stats as large numbers |
| 06 Use Cases | **light** | 3-column scenario map + interactive customer stories |
| Closing | dark | Full-width CTA |

## Animated Mockups

All functional sections use code-based animated UI mockups (no static images):

- **SimulatorMockup** (02): 3-step progress (Parse→Analyze→Generate) + persona card reveal with dimension bars
- **ResearcherMockup** (02): Live interview chat with typing indicators, sliding window (max 3 messages)
- **SignalMockup** (04): Treemap with div-based layout, 3 time snapshots cycling, blocks resize smoothly
- **DeepMockup** (04): 3-tab workflow (Brief/Intent/Execute), auto-cycling with click override
- **LiveMockup** (04): Focused interview — centered question, bottom mic icon, message cycling

## Use Cases Section

- **Scenario Map**: 3 numbered columns (01 Enterprise / 02 Academic / 03 Prediction), flowing text
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
- No i18n — English first
- Prefer Tailwind standard utilities over arbitrary px values

## Clients

Mars, Bosch, Lenovo, Fonterra, Ant Group, Huawei, L'Oréal, WPP, Proya

## Known Issues / TODOs

- GlobalFooter color doesn't match page bg — need `v2/layout.tsx` with `className="!bg-[#09090b]"`
- `docs/` screenshots moved elsewhere (ask user for location when needed)
- Nav highlighting: uses separate IntersectionObserver from bg scene tracking
- DefaultLayout `overflow-y-auto` fix in HomeV43Page (traverses parent elements)
- HomeV43Page.tsx / HomeV43.module.css still use "V43" naming — consider renaming to "V2"
