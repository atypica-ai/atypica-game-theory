# Less AI, More Intelligence: atypica's Design Philosophy

February 2026 (Revised)

## Why We Design This Way

atypica.AI uses AI to simulate consumers, compressing market research from weeks to minutes. But that description is misleading — it sounds like we're showing off technology. What we actually do is help people understand people. AI is the tool, but the output is insight into human nature.

So the core question of design becomes: how do we visually present a deep understanding of people, without falling into the trap of looking like every other AI product?

### Less AI, More Intelligence

This is the core of our design philosophy.

Every AI product in the market uses neon colors, 3D renders, and tech-gradient aesthetics. We chose the opposite direction — **retro-futurism**. Not the dark, dystopian kind, but the bright, transparent, warmly optimistic kind: the intelligence of 1970s Braun industrial design, the simplicity of early Apple, the precision of analog instruments.

When everyone else is trying to look "very AI", we choose to look **intelligently human**.

## Retro-Futurism as Visual Language

Our visual language draws from a specific era of design — the 1960s-1980s golden age of industrial design when products were both beautiful and functional, warm and precise.

**Key references:**
- **Dieter Rams / Braun**: Rounded forms, matte surfaces, precise controls, honest materials
- **Early Apple**: Clean white surfaces, gentle curves, human-scale technology
- **Vintage scientific instruments**: Oscilloscopes, chart recorders, analog gauges — precision made visible
- **Mid-century furniture and objects**: Warm wood, brass fittings, craftsmanship over mass production

**What this is NOT:**
- Cyberpunk or dystopian retro
- Vaporwave or ironic nostalgia
- Steampunk or fantasy-tech
- Dark, gritty, or industrial

## Abstract Over Photographic

Our visuals are **abstract**, not photographically realistic. We don't use stock photos of people in offices or generic business imagery. Instead, we create imagery that functions as visual metaphor.

A vintage card catalog cabinet represents our persona library. An oscilloscope waveform represents behavioral modeling. Flowing ink in water represents the fluid nature of human subjectivity.

These images convey concepts through objects and forms, not through literal depictions of the technology or its users.

## Image Generation with nano-banana

Our image generation model (nano-banana) has a distinctive capability: it reasons about prompts and accepts longer, structured inputs. This means prompts should be written as descriptive paragraphs, not keyword lists.

### Prompt Structure

Each prompt should contain:

1. **Subject description** — What is the scene/object? Be specific about the era, type, and characteristics.
2. **Style reference** — Name specific designers, photographers, or design traditions.
3. **Color palette** — Explicit colors: warm cream, brushed aluminum, brass gold, sage green.
4. **Lighting** — Direction, quality, warmth. Usually warm natural light from a specific angle.
5. **Mood and meaning** — What concept does this image represent? What feeling should it evoke?
6. **Exclusions** — No people, no modern technology, no digital screens, no text.
7. **Technical** — Photography style reference, resolution (8k), film grain if desired.

### Example Prompt

```
A vintage oscilloscope from the late 1970s displaying a warm green phosphor
waveform on its circular CRT screen. The instrument has a brushed aluminum
faceplate with precisely labeled Bakelite knobs and toggle switches, sitting
on a clean white laboratory bench. Warm afternoon light enters from a window
to the right, casting a soft glow on the instrument's surface. The waveform
shows a complex, organic pattern that suggests the irregular rhythms of human
behavior and decision-making. Inspired by the aesthetic of early Hewlett-Packard
test equipment catalogs. Color palette: warm cream background, brushed silver
instrument, green phosphor glow, warm natural light. No people, no modern
technology, no digital displays. Film grain texture. 8k resolution.
```

### Prompt Anti-Patterns

- **Keyword stuffing**: "abstract, bokeh, 8k, minimal, elegant" — too vague
- **AI clichés**: "holographic, neon, glowing particles, dark void" — exactly what we avoid
- **Generic photography**: "professional photo of business meeting" — too literal
- **Missing context**: No style reference, no color guidance, no exclusion list

## Color System

### Brand Green

Our brand color is green, used sparingly and deliberately:

- **Primary brand green**: `#2d8a4e` — forest green, mature and intelligent
- **Light accent green**: `#4ade80` — used on dark backgrounds for readability
- **Usage**: Section labels, CTA buttons, key data points, subtle accents
- **Never**: Full-screen green glow, neon green (#00ff00), green-dominant color schemes

### Background Strategy

We don't commit to all-dark or all-light. Each section uses the background that best serves its content:

- **Hero / CTA**: Dark (`#0a0a0c`) — creates immersive, dramatic entry and exit
- **Core Tech section**: Dark (`#1a1a1a`) — orbit diagram needs dark background
- **Content sections**: Warm white (`#fafaf8`) — bright, airy, easy to read
- **Rhythm**: Alternating light and dark creates visual rhythm and prevents monotony

### Text Colors

On light backgrounds:
- Primary: `text-zinc-900`
- Secondary: `text-zinc-600`
- Muted: `text-zinc-400`

On dark backgrounds:
- Primary: `text-white`
- Secondary: `text-white/70`
- Muted: `text-white/40`

### Card Styles

On light backgrounds:
- `bg-white border border-zinc-200 shadow-sm`
- Hover: `hover:shadow-lg hover:border-zinc-300`

On dark backgrounds:
- `bg-white/[0.05] border border-white/[0.08]`
- Hover: `hover:border-[#2d8a4e]/20`

## Website Section Image Guide

| Section | Image Direction | Key Object |
|---------|----------------|------------|
| Hero | Retro Tech control console | Braun-style instrument panel with dials and switches |
| Manifesto Left | Precision mechanics | Vintage mechanical calculator, brass gears |
| Manifesto Right | Organic abstraction | Flowing ink in water, warm amber tones |
| Thesis: Simulator | Analog measurement | Vintage oscilloscope with green waveform |
| Thesis: Researcher | Conversation visualization | Flowing ribbon forms suggesting dialogue |
| ProductModules: Proactive | Always-on detection | Vintage radar display with green sweep |
| ProductModules: Auto | Systematic workflow | Collection of vintage scientific instruments |
| ProductModules: Human | Intimate dialogue | Vintage microphones facing each other |
| ProductModules: Model | Cognitive modeling | Brass wireframe head sculpture |
| SubjectiveModel: Persona | Identity collection | Mid-century card catalog cabinet |
| SubjectiveModel: Sage | Expert knowledge | Leather-bound encyclopedias |
| SubjectiveModel: Panel | Collective intelligence | Vintage boardroom with brass nameplates |
| InteractionModes | Communication diversity | Collection of vintage communication devices |
| UseCases | Data visualization | Retro instruments: acrylic pie chart, chart recorder, gauge panel |
| CTA | Hopeful horizon | Warm golden sunset landscape, Rothko-inspired |

## Grain Overlay

We use a subtle SVG-based film grain texture across the entire page:

- Low frequency (`0.7`), few octaves (`3`), very low opacity (`0.03`)
- Applied with `mix-blend-multiply` for natural integration with both light and dark sections
- Overall overlay opacity: `20%`
- Creates a warm analog film feeling without being distracting

## Report and Document Design

Research reports maintain the same philosophy:

**Color**: Black, white, gray as foundation. Brand green `#2d8a4e` as single accent color. No colored cards or background blocks.

**Typography**: EuclidCircularA for headings, IBMPlexMono for data and labels. Hierarchy through weight and size, not color.

**Imagery**: Same Retro Tech abstract style. Reports can include visualization-type images (chart recorders, gauge panels) that metaphorically represent the data being discussed.

## Quality Standards

**Visual Identity**: Does it look like atypica — bright, warm, retro-intelligent — or could it be any AI product?

**Retro Tech Authenticity**: Do the vintage objects feel specific and real (a 1970s Braun radio) rather than generic ("retro device")?

**Prompt Quality**: Is the image prompt a structured paragraph with subject, style, color, lighting, mood, and exclusions?

**Color Discipline**: Is green used only as a small accent? Are light/dark backgrounds chosen purposefully?

**Avoid AI Clichés**: No neon gradients, no floating 3D objects, no particle effects, no holographic displays, no dark-only aesthetic.

## In Closing

Less AI, more intelligence.

The intelligence of a beautifully designed instrument. The warmth of brass and natural light. The precision of analog measurement. The optimism of an era that believed technology should serve human understanding.

We don't try to look futuristic. We look like what the future should have been — warm, bright, intelligently human.
