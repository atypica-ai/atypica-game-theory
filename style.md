# arena.ai/leaderboard — Design Essence

> Rules where removing any one makes the interface look like something else.

Source: CSS extracted from compiled stylesheets (`04fed9dded315e5b.css`), rendered HTML structure, and WebFetch visual analysis.

---

## 1. Surface Color: Warm Off-White, Not Neutral

The light mode background is `hsl(36 45% 98%)` — a peachy warm tint, not gray-white or pure white. This warmth pervades every surface layer.

```css
--surface-primary: 36 45% 98%;    /* page background */
--surface-secondary: 0 0% 100%;   /* card/panel inset — pure white by contrast */
--surface-tertiary: 33 31% 94%;   /* slightly deeper warm tint for alternating rows */
```

Dark mode flips to `hsl(60 3% 14%)` — a warm near-black (the same warm cast, just inverted).

The rule: surfaces are never neutral grey. The warmth is the brand temperature.

---

## 2. The HSL Semantic Token Architecture

Every color is a named semantic variable, never a hardcoded hex. This is the architectural decision that makes theming work:

```css
/* Text scale — four levels */
--text-primary:    24 6% 17%   /* high contrast, main content */
--text-secondary:  30 7% 24%   /* supporting content */
--text-tertiary:   35 6% 38%   /* labels, metadata */
--text-muted:      37 5% 52%   /* disabled, placeholders */

/* Interactive states */
--interactive-link:     208 77% 52%   /* all clickable text/icons */
--interactive-positive: 125 49% 43%  /* scores going up, correct */
--interactive-negative: 2 63% 54%    /* scores going down, wrong */
--interactive-warning:  48 93% 45%   /* caution states */

/* Borders */
--border-faint: 30 5% 93%  /* hairline dividers */
```

The rule: no raw color values anywhere in component code. Every color reference goes through a semantic variable.

---

## 3. Typography: BaselGrotesk + Book Weight

The primary font is **BaselGrotesk** — a custom geometric grotesque, not Inter or system-ui. Matched with **BaselGrotesk-Mono** for numeric/code content.

```css
--font-basel-grotesk: "BaselGrotesk", ...;
--font-basel-grotesk-mono: "BaselGrotesk-Mono", ...;
```

The distinctive weight choice: `font-weight: 450` ("book") — an intermediate between regular (400) and medium (500). This gives body text a slightly denser, more typeset feel than typical web defaults.

```css
/* weight scale */
400  /* normal — captions, secondary text */
450  /* book — body text, table cells */
500  /* medium — subheadings */
600  /* semibold — headings, important labels */
700  /* bold — primary headings */
```

The rule: body text uses `450`, not `400`. The difference is subtle but uniform.

---

## 4. Text Hierarchy Through Color, Not Weight

The four-level `--text-*` scale is the primary hierarchy tool. Weight only changes at structural boundaries (heading vs. body), not within the data table itself.

```tsx
/* A model row in the leaderboard */
<td className="text-[--text-primary]">Claude Opus 4</td>      /* model name */
<td className="text-[--text-secondary]">Anthropic</td>         /* org */
<td className="text-[--text-tertiary]">1,248 votes</td>        /* votes */
<td className="text-[--text-muted]">—</td>                     /* missing data */
```

The rule: visual hierarchy within dense data tables is entirely communicated through color shade, not size or weight variation.

---

## 5. Single Interactive Color: Blue

All interactive elements — links, active tabs, hover states — use one color: `hsl(208 77% 52%)`. Nothing else is interactive-blue.

```css
--interactive-link: 208 77% 52%;  /* light mode */
--interactive-link: 208 100% 58%; /* dark mode — slightly brighter */
```

The rule: blue = clickable/active. No secondary interactive color.

---

## 6. Semantic Green/Red for Outcomes

Score comparisons, win rates, and performance deltas use semantic color — not grey or neutral:

```css
--interactive-positive: 125 49% 43%;  /* score increase, win */
--interactive-negative: 2 63% 54%;    /* score decrease, loss */
```

These appear as small indicators next to numeric values. The rule: data outcome always gets a semantic color. Never grey for a delta.

---

## 7. Pill Border-Radius for Badges, Consistent Rounding Elsewhere

Category tags and rank badges use `9999px` (full pill). Everything else uses a consistent small-to-medium rounding scale:

```css
/* Component radius scale */
0.25rem   /* sm — input fields, table cells */
0.375rem  /* md — buttons, cards */
0.5rem    /* lg — panels, dropdowns */
9999px    /* full — badges, tags, pills */
```

The rule: interactive items (buttons, inputs) use `0.375rem`. Category/status badges are always pills (`9999px`). No sharp corners.

---

## 8. Tab Navigation: Inset Bottom Border as Active Indicator

The category tabs (Text, Code, Vision, etc.) use an inset bottom border — not an underline, not a background fill:

```css
/* Active tab */
box-shadow: inset 0 -1px 0 0 hsl(var(--border-faint));

/* Active state upgrades to interactive-link color */
border-bottom: 2px solid hsl(var(--interactive-link));
```

The rule: tab selection = bottom border in `--interactive-link` blue. Never a background highlight.

---

## 9. Motion: Functional, Not Expressive

This is a data tool, not a marketing page. Transitions are minimal and utilitarian:
- Tab switches: no animation, instant content swap
- Sorting: no animated reordering
- Theme toggle: no transition

The rule: if motion would distract from reading data, there is none. Only hover state color transitions exist.

---

## 10. Negative Letter-Spacing on Headlines

Display text and category headings use slightly tight tracking:

```css
letter-spacing: -0.025em;  /* tight — headlines, model names */
letter-spacing: 0.025em;   /* wide — all-caps labels */
```

The rule: headlines track tight (`-0.025em`). All-caps labels track wide (`+0.025em`). Body text uses the default.

---

## Summary

| Decision | Value |
|----------|-------|
| Light surface | `hsl(36 45% 98%)` — warm peachy off-white |
| Dark surface | `hsl(60 3% 14%)` — warm near-black |
| Primary font | `BaselGrotesk` — custom geometric grotesque |
| Mono font | `BaselGrotesk-Mono` — matched mono |
| Body weight | `450` "book" — not standard `400` |
| Color architecture | All HSL semantic variables — no hardcoded values in components |
| Text hierarchy | 4 levels (primary → muted) — color only, not size/weight |
| Interactive color | `hsl(208 77% 52%)` blue — the only interactive color |
| Outcome color | Green `hsl(125 49% 43%)` / Red `hsl(2 63% 54%)` for deltas |
| Badges | `border-radius: 9999px` pill always |
| Buttons/cards | `border-radius: 0.375rem` |
| Motion | None — data tool, not expressive UI |
| Tab indicator | Inset bottom border, never background highlight |
| Headline tracking | `-0.025em` tight |
