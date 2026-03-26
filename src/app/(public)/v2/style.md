# V2 Style — Design Essence

> Rules: if you remove any of these, the page no longer looks like itself.

---

## 1. Background

**`#09090b`** — not "dark", not "black". This specific near-void tone. Warmer than pure black, darker than zinc-900. Everything lives on top of it.

```tsx
<main className="bg-[#09090b] text-white">
```

---

## 2. The Three-Font System

All three must coexist. Remove any one and the system collapses.

| Font | Role | Feel |
|------|------|------|
| `EuclidCircularA` | Headlines, large stats | Clean, geometric, modern sans |
| `IBMPlexMono` | Labels, chapter numbers, metadata | System, technical, precise |
| `InstrumentSerif` italic | Quotes, emotional accent words | Human voice, contrast |

---

## 3. Mono Labels: ALL CAPS + Wide Tracking

Every label, chapter number, badge, and metadata string follows this exact pattern:

```tsx
// Chapter number — brand accent
<span className="font-IBMPlexMono text-xs tracking-[0.18em] text-ghost-green">01</span>

// Category label — muted
<span className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-500">
  TWO WORLDS
</span>
```

Rules: `font-IBMPlexMono` + `text-xs` + `uppercase` + tracking between `0.12em`–`0.18em`. Never larger than `text-xs` for a label.

---

## 4. Ghost Green as the Brand Accent

**`#1bff1b`** — defined as `--ghost-green`. One color. Everything else is white or zinc-grey.

```css
--ghost-green: #1bff1b;
```

It appears in exactly these roles:
- Chapter numbers in the nav and section headers
- Active/current state in the sticky nav
- Primary CTA background (with `text-black`)
- The "subjective" or emotional accent word inside a headline (dark sections only)
- The live-indicator dot (pulsing badge)

The rule: **one brand accent, used precisely**. Anything else that needs color uses a per-item accent (see §5).

---

## 5. Per-Item Accent Color System

Every categorical item — use case, data asset, story, agent — gets its own color. That color is applied consistently through four micro-elements:

```tsx
// 1. A tiny colored dot
<span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />

// 2. A short horizontal dash rule (section divider)
<span className="h-px w-4" style={{ backgroundColor: accent }} />

// 3. The large stat value
<span className="font-EuclidCircularA text-5xl font-light" style={{ color: accent }}>
  10,000+
</span>

// 4. A left-edge bar on story cards
<div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: accent }} />
```

This system makes every card distinct without breaking the monochrome field. The colors used: ghost-green, `#3b82f6`, `#d97706`, `#8b5cf6`, `#22d3ee`, `#f59e0b`, `#93c5fd`, `#f472b6`, `#fb923c`.

---

## 6. InstrumentSerif Italic = Human Voice

The serif italic is used for anything that represents a human speaking or feeling — quotes and emotional accent words inside headlines. It is not restricted to one location.

```tsx
// Emotional accent word inside a headline (dark section → ghost green)
<h1 className="font-EuclidCircularA text-8xl font-medium">
  Understand{" "}
  <span className="italic font-InstrumentSerif text-ghost-green">people</span>
  , not just data
</h1>

// Pull quote in a section (dark → white)
<h2 className="font-InstrumentSerif italic text-5xl text-white">
  &ldquo;{quote}&rdquo;
</h2>

// Story card blockquote (light section → zinc-900)
<p className="font-InstrumentSerif text-[1.35rem] italic text-zinc-900">
  &ldquo;{quote}&rdquo;
</p>
```

The serif italic is always ghost green only on dark backgrounds when it's an accent word in a headline. In quotes and on light backgrounds it takes the local text color.

---

## 7. Chapter Navigation Pattern

The sticky left nav is structural identity:

```
01  TWO WORLDS
02  WORLD MODEL       ← active: number = ghost-green, label = zinc-100
03  TWO AGENTS
04  WORKFLOW
05  DATA ASSETS
06  SOLUTIONS
```

- Numbers: `font-IBMPlexMono text-xs` — inactive `text-zinc-600`, active `text-ghost-green`
- Labels: `font-IBMPlexMono text-xs uppercase` — inactive `text-zinc-600`, active `text-zinc-100`
- No other navigation exists during the chapters scroll.

---

## 8. Section Containers: Dark vs. Warm White

Two surface variants create rhythm through the page. Each chapter picks one.

```tsx
// Dark panel — most chapters
<div className="bg-zinc-900 p-12">

// Warm white panel — contrast section (Use Cases)
<div className="bg-[#fafaf8] text-gray-900 p-12">
```

The light surface is warm off-white `#fafaf8`, never pure white. It has its own inner token set: `border-zinc-200`, `bg-white/75` for cards, `text-zinc-500` for muted text.

---

## 9. CTA Buttons — Sharp Corners

Two types, used consistently. **Zero border-radius. No shadow. No gradient.**

```tsx
// Primary — solid ghost green, black text
<button className="h-11 px-6 bg-ghost-green text-black font-medium text-sm tracking-[0.04em]">
  Start Research →
</button>

// Secondary ghost — transparent, zinc border
<button className="h-11 px-6 border border-zinc-700 text-zinc-300 text-sm tracking-[0.04em]">
  Learn more
</button>
```

---

## 10. Ghost Green Status Badge

When something is "live", it gets this specific treatment — pulsing dot + ghost-green border at low opacity + dark backdrop:

```tsx
<span className="border border-ghost-green/[0.3] bg-zinc-800/80 backdrop-blur-sm font-IBMPlexMono text-xs tracking-[0.17em] uppercase text-ghost-green">
  <motion.span
    className="w-1.5 h-1.5 rounded-full bg-ghost-green"
    animate={{ opacity: [1, 0.4, 1] }}
    transition={{ duration: 2, repeat: Infinity }}
  />
  LIVE SYSTEM
</span>
```

---

## 11. Font Weight as Information

EuclidCircularA is used at two weights with distinct semantic roles — never interchangeably:

```tsx
// font-light → decorative, large, atmospheric (stats, ghost numbers)
<span className="font-EuclidCircularA text-5xl font-light" style={{ color: accent }}>
  10,000+
</span>

// font-medium → structural, headings, CTAs
<h2 className="font-EuclidCircularA text-5xl font-medium leading-[1.1]">
  {title}
</h2>
```

Body text uses no weight class at all (default/regular). Color handles hierarchy in the body — weight is only varied at the display scale.

---

## 12. Ghost Green Opacity System

Ghost green never appears at one opacity level — it appears at a gradient of opacities that communicate proximity to "live/active":

| Usage | Opacity | Example |
|-------|---------|---------|
| Interactive: CTA, dot, chapter number | full `#1bff1b` | `bg-ghost-green`, `text-ghost-green` |
| Borders around active states | 30% | `border-ghost-green/[0.3]` |
| Sub-labels, secondary accent text | 60% | `text-ghost-green/60` |
| Table cell tints, background washes | 3–6% | `bg-ghost-green/[0.03]` |
| SVG chart data (stated line) | 40% stroke | `stroke="rgba(27,255,27,0.4)"` |

The rule: **full opacity = you can interact with it or it is the brand signal**. Lower opacity = context, data, reference.

---

## 13. Motion: whileInView Entrance

Every content block below the hero uses an identical entrance pattern — it does not exist without this:

```tsx
<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-80px" }}
  transition={{ duration: 0.5 }}
>
```

Rules: always `y: 24`, always `opacity: 0→1`, `duration: 0.5`, fires once. This creates the feeling that the system is revealing itself as you scroll — not "animation" but "activation".

The hero has its own separate motion: scroll-driven parallax that scales the background image up and fades both image and text out as you leave:

```tsx
const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
const bgOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
const textY = useTransform(scrollYProgress, [0, 0.7], [0, -60]);
```

---

## 14. Fixed Scene Background System

Behind all chapters there is a fixed-position layer of AI-generated images — one per chapter — that crossfade with a 1.2s transition as the active chapter changes:

```tsx
// Fixed, full-viewport, pointer-events-none
<div className="fixed inset-0 z-1 pointer-events-none">
  <Image
    className={cn(
      "object-cover opacity-0 transition-opacity duration-1200 ease-in-out",
      isDark ? "filter: grayscale(0.4) brightness(0.6); mix-blend-mode: screen"
             : "filter: grayscale(0.5) contrast(1.05) brightness(0.9); mix-blend-mode: multiply",
      isActive && "opacity-15",
    )}
  />
</div>
```

The image is nearly invisible (`opacity-15`) but it creates a distinct atmospheric texture for each chapter. Dark chapters use `mix-blend-mode: screen`, light chapters use `mix-blend-mode: multiply`. Without this the page is a flat dark field with no depth.

---

## 15. Gap-as-Divider Grid

A recurring spatial technique: `gap-px` with a background color equal to the desired divider color. The gap pixels become 1px lines between cells.

```tsx
// Creates razor-thin zinc-800 dividers between grid cells
<div className="grid grid-cols-2 gap-px bg-zinc-800">
  <div className="bg-zinc-900 p-6">...</div>
  <div className="bg-zinc-900 p-6">...</div>
</div>

// Light surface variant
<div className="grid grid-cols-3 gap-px bg-zinc-200">
  <div className="bg-white p-4">...</div>
</div>
```

Used for the World Model layer grid, the cross-analysis example cards, and data tables. The visual result is a seamless tiled surface with hairline separators — distinct from bordered cards.

---

## 16. Ghost Index Watermark

Story cards contain a large ghost number positioned top-right, nearly invisible:

```tsx
<div
  className="pointer-events-none absolute right-5 top-5 font-EuclidCircularA text-[6rem] leading-none text-zinc-950/[0.06]"
  aria-hidden="true"
>
  01
</div>
```

`text-zinc-950/[0.06]` on a near-white background — 6% opacity. It communicates sequence without competing with content. This is EuclidCircularA `font-light` at max scale used purely as texture.

---

## Summary Table

| Decision | Value |
|----------|-------|
| Background | `#09090b` |
| Brand accent | `#1bff1b` ghost green — one color, used at 5 opacity levels |
| Display font | `EuclidCircularA` — geometric sans |
| Label font | `IBMPlexMono` — ALL CAPS, `tracking-[0.12em–0.18em]`, always `text-xs` |
| Human-voice font | `InstrumentSerif` italic — quotes and emotional headline accents |
| Font weight | `font-light` = decorative/stats; `font-medium` = structural/headings |
| Item accent system | colored dot + dash + stat value + left bar, per category |
| Corners | Sharp — no border-radius on interactive elements |
| Light surface | Warm off-white `#fafaf8`, not pure white |
| Secondary text | Zinc scale only — color = hierarchy, weight only varies at display scale |
| Motion | `whileInView` y+opacity entrance everywhere; hero scroll parallax |
| Atmosphere | Fixed-position scene images at `opacity-15` crossfading per chapter |
| Grid dividers | `gap-px bg-zinc-800` — the gap pixel becomes the 1px border |
| Ghost watermark | `text-[6rem] text-zinc-950/[0.06]` index number as background texture |
