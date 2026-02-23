# Home V4-3

## File Structure

```
src/app/(public)/home-v4-3/
├── page.tsx                    # Entry
├── HomeV43Page.tsx             # Main page (sticky nav + IntersectionObserver × 2)
├── HomeV43.module.css          # ~115 lines (keyframes/filter/table/mask-image only)
├── content.ts                  # All copy and data
├── components/
│   └── ChapterPanel.tsx        # Dark/light panel wrapper (variant prop)
├── sections/
│   ├── HeroSection.tsx         # Full-width centered, own bg image + gradient
│   ├── TwoWorldsSection.tsx    # 01 - Kahneman quote + objective vs subjective cards
│   ├── TwoAgentsSection.tsx    # 02 - Simulator + Researcher dual column
│   ├── WorldModelSection.tsx   # 03 - 4-layer concentric rings + 6 dimension nodes
│   ├── ThreeModesSection.tsx   # 04 - Signal/Deep/Live cards (→/newstudy)
│   ├── DataAssetsSection.tsx   # 05 - Persona/Sage/Panel (light panel)
│   ├── UseCasesSection.tsx     # 06 - Table + 4 customer stories (light panel)
│   ├── LogoWall.tsx            # Infinite scroll logo wall (between chapters & closing)
│   ├── ClosingSection.tsx      # Full-width CTA
│   ├── ScrollBackground.tsx    # Global fixed bg image switching (skips hero)
│   └── ChapterBackground.tsx   # DEPRECATED — can be deleted
└── docs/                       # Design docs + fin.ai screenshots (not in git)
    ├── 01-hero.png ~ 14-footer.png   # fin.ai reference screenshots
    ├── content-plan.md               # Full copy plan per section
    ├── design-decisions.md           # All design decisions
    └── design-reference.md           # fin.ai analysis
```

## Layout Architecture

- Page background: `#09090b` (zinc-950)
- Content panels: `#18181b` (zinc-900) dark / `#fafaf8` light
- Constrained width `max-w-[1400px]` centered
- `chaptersArea` is flex: left sticky nav (w-40) + right `chaptersContent`
- Hero and Closing are outside `chaptersArea`, full-width
- LogoWall sits between `chaptersArea` and Closing
- `ScrollBackground` is fixed bg layer at z-1, images fade in/out with chapter switching
- Each chapter wrapped in `ChapterPanel` (dark: zinc-900, light: #fafaf8), **no border-radius**

## Brand Colors

- Primary: `#1bff1b` (bright green, button bg, text must be black)
- Primary dark: `#15b025` (hover state)
- Buttons: solid green bg + black text, no transparency
- Green color has no transparency — keep it opaque

## Narrative Structure

> "We don't react to reality. We react to the model inside our heads." — Kahneman

Most agents do tasks for you. Atypica is the other kind — it simulates the subjective world to understand people.

### Page Structure (7 chapters)

```
Hero        — The Agent That Understands Humans + social proof badges
01 TWO WORLDS    — Kahneman quote + objective vs subjective
02 TWO AGENTS    — Simulator(Persona/Sage) + Researcher(5 research methods)
03 WORLD MODEL   — 4-layer model (Expression/Story/Cognition/Behavior) + 6-dimension ring
04 THREE MODES   — Signal / Deep / Live, each links to /newstudy
05 DATA ASSETS   — AI Persona / AI Sage / AI Panel, hard data
06 USE CASES     — Business scenario table + 4 customer stories
LogoWall         — Scrolling client logos
Closing          — CTA
```

### Core Mappings (Narrative ↔ Product)

- Expression Layer = Scout Agent (5 platforms, 14 social tools)
- Story Layer = Interview System (1-on-1 deep interviews)
- Cognition Layer = The model itself (Persona prompt encoding)
- Behavior Layer = Use cases (Study Agent research types)
- Signal Mode = Proactive Agent / scoutSocialTrends
- Deep Mode = Study Agent + Fast Insight Agent (full-auto research)
- Live Mode = Panel / Interview (real-time conversations)
- AI Persona: Tier 0-3, pgvector 1024d embeddings, 1M AI + 70K human, 85% accuracy
- AI Sage: Two-layer memory (core + working), knowledge gap discovery
- AI Panel: PersonaPanel + DiscussionTimeline, 3 discussion types (focus/debate/roundtable)

Full mapping doc: `memory/atypica-narrative-product-mapping.md`

## Image Strategy

- **Abstract AI images**: ONLY for backgrounds (Hero bg, ScrollBackground)
- **Functional sections**: CSS/SVG minimal UI mockups (Interview chat UI, Scout social feed UI, Panel discussion UI, Persona profile card UI, Sage knowledge layers UI)
- Light chapter bg images use dark-base prompts ("on dark matte surface") so multiply blend works on white

## Design Principles

- **Copy vs Philosophy**: "Less AI, more intelligence" = design philosophy, NEVER in visible page copy. "The Agent That Understands Humans" = product tagline, Hero headline.
- **No border-radius** on panels/cards
- **No transparency on green** — brand green is always opaque
- **Buttons**: solid green bg `#1bff1b` + black text

## Design Reference (fin.ai)

Screenshots in `docs/01-hero.png` ~ `docs/14-footer.png`.

Key takeaways:
- Uniform content width + left sticky nav (01-06 numbered)
- Serif display font (EuclidCircularA) + mono labels (IBMPlexMono)
- Single accent color (we use green instead of their orange)
- Generous whitespace
- Nav area always dark — white is only for center content area
- Last section and Hero are full-width
- Logo wall: horizontal scroll + left/right fade-out masks

## Tech Stack

- **Tailwind CSS** for all styles (CSS Module only for keyframes/filter/mask-image/table)
- **framer-motion** for animations
- **Next.js Image** component
- **cn()** from `@/lib/utils` for conditional classes
- No i18n — English first
- Prefer Tailwind standard utilities over arbitrary `px` values
- Use rem-based measurement system

## Clients

Mars, Bosch, Lenovo, Fonterra, Ant Group, Huawei, L'Oréal, WPP, Proya

## Known Issues / TODOs

- `ChapterBackground.tsx` is deprecated, can be deleted
- GlobalFooter color doesn't match page bg — need a `home-v4-3/layout.tsx` that passes `className="!bg-[#09090b]"` to GlobalFooter
- `docs/` directory is not committed to git
- Nav highlighting: uses separate IntersectionObserver from bg scene tracking
- DefaultLayout `overflow-y-auto` fix is in HomeV43Page (traverses parent elements)
