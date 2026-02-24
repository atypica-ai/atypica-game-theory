# Interactive Demo Guide — How to Build Product Demos for the V2 Homepage

## Philosophy

Interactive demos should feel like **real product pages**, not abstract animations. The goal is to let visitors experience the product workflow without signing up.

## Architecture

```
src/app/(public)/v2/demos/
├── theme.ts              — Shared light color tokens
├── ProductFrame.tsx       — App container (sidebar + header + content)
├── AnimCursor.tsx         — Animated mouse cursor overlay
├── RadarChart.tsx         — 7-dimension radar chart (SVG)
├── PersonaBuilderDemo.tsx — AI Simulator demo
└── FocusGroupDemo.tsx     — AI Researcher demo
```

Each demo is a **standalone component** that can be imported into any section. The TwoAgentsSection just imports and renders them.

## Key Principles

### 1. Use a Product Container (ProductFrame)

Every demo lives inside `ProductFrame` — a light-theme app shell that mimics the real atypica.AI interface:

- **Thin sidebar** with icon placeholders (one highlighted to show active page)
- **Header** with breadcrumb navigation + help/menu icons (matching real GlobalHeader)
- **Content area** with `overflow-hidden` and `relative` positioning

The container uses **fixed height** (`h-[400px]`), not min-height. Content scrolls within it. Only the final screen may need the scroll.

### 2. Light Theme, Not Pure White

Use the warm off-white palette from `theme.ts`:

- `bg: "#f5f3ef"` — main background
- `bgSub: "#eceae4"` — cards, sidebars
- `bgCard: "#faf9f7"` — elevated elements
- `border: "#ddd9d0"` — primary borders
- Never use pure `#ffffff` — it's too harsh against the dark page background

### 3. Mimic Real Product Pages

The first screen of each demo should look like the **actual product page** it represents:

- **PersonaBuilderDemo**: Looks like `/persona` homepage (hero title, upload CTA, feature tiles)
- **FocusGroupDemo**: Looks like `/panel/[id]` detail page (panel title, persona grid)

Study the real page components before building the demo. Key files:

- `/src/app/(persona)/persona/PersonaHomePageClient.tsx`
- `/src/app/(panel)/(page)/panel/[panelId]/PanelDetailClient.tsx`
- `/src/app/(panel)/(page)/panel/project/[token]/DiscussionView.tsx`

### 4. Show Mouse Interaction

Use `AnimCursor` to simulate user interaction. This makes the demo feel alive:

- Cursor appears from outside the viewport
- Moves toward the interactive element (button, card)
- Shows a click animation (scale + ripple)
- Then the action triggers

**Timing rules:**

- Cursor movement: 400-600ms (not too fast — users need to see it)
- Pause before click: 200-400ms
- No pause after click — proceed immediately to the next state
- Use `getCenterX()` to position cursor relative to container center (responsive)

### 5. Content Scrolls, Container Stays Fixed

The demo container height is fixed. Content scrolls vertically within it:

- Upload/home screen: fits within container (no scroll needed)
- Processing screen: fits within container
- Result screen: **taller than container** — auto-scrolls down to reveal content

Use `scrollRef.current.scrollTo({ top: scrollHeight, behavior: "smooth" })` after a delay to animate the scroll.

### 6. Auto-Cycle with Click Override

Every demo cycles automatically:

```
home (2-2.5s) → cursor animation → processing → result (scroll) → loop back
```

Users can also click to advance. The auto-start timer resets when the phase changes.

**Timer management:** Use a `timersRef` array to track all timeouts. Clear all on phase change to prevent race conditions. Never use a single ref for multiple sequential timeouts.

```typescript
const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
function clearTimers() {
  timersRef.current.forEach(clearTimeout);
  timersRef.current = [];
}
function schedule(fn: () => void, ms: number) {
  timersRef.current.push(setTimeout(fn, ms));
}
```

### 7. Dialog Overlay Placement

When showing a modal dialog (like the Focus Group creation dialog), the overlay must cover the **entire ProductFrame content area**, not just the current phase's div. Place it as a sibling of the scroll container, positioned absolutely within the content area (which has `position: relative`).

```tsx
{
  /* Dialog overlay — OUTSIDE scroll container */
}
<AnimatePresence>
  {showDialog && (
    <motion.div className="absolute inset-0 z-20" style={{ background: "rgba(0,0,0,0.12)" }}>
      <Dialog />
    </motion.div>
  )}
</AnimatePresence>;

{
  /* Scroll container */
}
<div ref={scrollRef} className="h-full overflow-y-auto">
  {/* Phase content */}
</div>;
```

### 8. Use HippyGhostAvatar for Personas

Always use `HippyGhostAvatar` with deterministic `seed` values to represent personas. This matches the real product:

```tsx
<HippyGhostAvatar seed={1042} className="size-7 rounded-full" />
```

Seeds should be consistent across the demo (same persona = same seed = same avatar).

### 9. Phase Transitions

Use `AnimatePresence mode="wait"` for phase transitions:

- Entry: `opacity: 0 → 1` (fast, 150ms)
- Exit: `opacity: 1 → 0` (fast, 150ms)
- Within a phase, stagger child elements with `delay` for a polished feel

### 10. Font Sizes in Demos

Since demos render at a smaller scale inside the product container:

- Titles: `text-base` (not larger — the container is small)
- Body text: `text-xs` to `text-sm`
- Labels/mono: `text-xs`
- All text uses `style={{ color: L.xxx }}` for consistent theming

## Checklist for New Demos

1. [ ] Study the real product page you're mimicking
2. [ ] Create a new file in `demos/` folder
3. [ ] Wrap content in `ProductFrame` with appropriate breadcrumb
4. [ ] First screen looks like the real product page
5. [ ] AnimCursor shows user interaction
6. [ ] Fixed container height, content scrolls
7. [ ] Auto-cycle with clean timer management
8. [ ] Light theme colors from `theme.ts`
9. [ ] HippyGhostAvatar for persona representations
10. [ ] Test on both desktop and mobile layouts
