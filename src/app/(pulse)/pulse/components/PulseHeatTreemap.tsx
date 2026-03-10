"use client";

import { cn } from "@/lib/utils";
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

type HeatHistoryPoint = { date: string; heatScore: number };

type HeatTreemapPulse = {
  id: number;
  title: string;
  content: string;
  heatScore: number;
  heatDelta: number | null;
  createdAt: Date;
  history: HeatHistoryPoint[];
  categoryId?: number; // Add categoryId for color mapping
};

type HeatTreemapCategory = {
  id: number;
  name: string;
  heatScore: number;
  pulseCount: number;
  pulses: HeatTreemapPulse[];
};

type PulseHeatTreemapProps = {
  categories: HeatTreemapCategory[];
  updatedAt: string;
  onPulseClick?: (pulseId: number) => void;
};

type TreeNodeData = {
  type: "root" | "category" | "pulse";
  id: string;
  parentCategoryId?: number;
  label: string;
  rawTitle?: string;
  heatScore: number;
  heatDelta: number | null;
  pulseCount: number;
  content?: string;
  history: HeatHistoryPoint[];
  sizeValue: number;
  children?: TreeNodeData[];
  pulseIndexInCategory?: number; // Index within category for color variation
};

type TooltipState = TreeNodeData | null;
type TreemapNode = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  data: TreeNodeData;
};
type RectBounds = { x0: number; y0: number; x1: number; y1: number };

const WIDTH = 1500;
const HEIGHT = 840;
const TOOLTIP_WIDTH = 320;
// Canvas doesn't support CSS variables, use actual font name for measurements
const TEXT_FONT_FAMILY_FOR_MEASUREMENT = "EuclidCircularA, Arial, Helvetica, sans-serif";

// Contrast adjustment variables - adjust these to control visual contrast

// CATEGORY_SIZE_CONTRAST_EXPONENT: Controls contrast for category box sizes
//   - 1.0 = linear (no contrast enhancement)
//   - 1.5 = moderate contrast (recommended: smaller than pulse contrast)
//   - 2.0+ = high contrast
const CATEGORY_SIZE_CONTRAST_EXPONENT = 1.0;

// PULSE_SIZE_CONTRAST_EXPONENT: Controls contrast for pulse box sizes within categories
//   - 1.0 = linear (no contrast enhancement)
//   - 2.0 = squared (moderate contrast)
//   - 2.5+ = very high contrast (big boxes much bigger, small boxes much smaller)
const PULSE_SIZE_CONTRAST_EXPONENT = 5.0;

const MAX_TILE_ASPECT_RATIO = 1.0; // Smaller ratio = more square boxes, better for text readability
const DISPLAY_PULSES_PER_CATEGORY = 8;
const CATEGORY_WEIGHT_SCALE = 1000;
const TEXT_BLOCK_HEIGHT_RATIO = 0.52; // Reduced to leave more margin and prevent overflow
const TITLE_FONT_MAX = 36;
const HEAT_DELTA_FONT_MAX = 32;
const CATEGORY_GAP_PX = 10;
const PULSE_GAP_PX = 0.2;
const MAP_TEXT_SHADOW_FILTER_ID = "map-text-shadow";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function transformScoreWithContrast(raw: number, min: number, max: number, exponent: number) {
  if (max <= min) return Math.max(1, raw);
  const normalized = clamp((raw - min) / (max - min), 0, 1);
  return 1 + Math.pow(normalized, exponent) * 100;
}

function insetRectWithFixedGap(
  rect: RectBounds,
  gap: number,
  bounds: RectBounds,
  epsilon = 0.01,
): RectBounds {
  // Reduce gap to half by dividing by 4 instead of 2
  const half = gap / 4;
  const leftInset = rect.x0 <= bounds.x0 + epsilon ? 0 : half;
  const rightInset = rect.x1 >= bounds.x1 - epsilon ? 0 : half;
  const topInset = rect.y0 <= bounds.y0 + epsilon ? 0 : half;
  const bottomInset = rect.y1 >= bounds.y1 - epsilon ? 0 : half;

  const x0 = rect.x0 + leftInset;
  const y0 = rect.y0 + topInset;
  const x1 = rect.x1 - rightInset;
  const y1 = rect.y1 - bottomInset;

  // Keep valid rectangles even in extremely tiny cells.
  if (x1 <= x0 || y1 <= y0) return rect;
  return { x0, y0, x1, y1 };
}

function normalizeTitle(title: string) {
  const firstPart = title.split(":")[0]?.trim() ?? title;
  const words = firstPart.split(/\s+/).filter(Boolean).slice(0, 3);
  return words.join(" ");
}

function getTextMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  return canvas.getContext("2d");
}

function measureTextWidth(
  ctx: CanvasRenderingContext2D | null,
  text: string,
  fontSize: number,
  fontWeight: number,
): number {
  if (!ctx) {
    // Fallback for environments without canvas context.
    return text.length * fontSize * 0.58;
  }
  ctx.font = `${fontWeight} ${fontSize}px ${TEXT_FONT_FAMILY_FOR_MEASUREMENT}`;
  return ctx.measureText(text).width;
}

function wrapWordsToWidth(
  ctx: CanvasRenderingContext2D | null,
  words: string[],
  maxWidth: number,
  fontSize: number,
  fontWeight: number,
): { lines: string[]; allWordsFit: boolean } {
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    // Try adding word to current line
    const candidate = line ? `${line} ${word}` : word;
    const candidateWidth = measureTextWidth(ctx, candidate, fontSize, fontWeight);
    
    if (candidateWidth <= maxWidth) {
      // Word fits on current line
      line = candidate;
      continue;
    }

    // Word doesn't fit on current line - start a new line
    if (line) {
      lines.push(line);
      line = "";
    }

    // Check if word fits on its own line (without splitting)
    const wordWidth = measureTextWidth(ctx, word, fontSize, fontWeight);
    if (wordWidth <= maxWidth) {
      // Word fits on its own line
      line = word;
      continue;
    }

    // Word doesn't fit even on its own line - font size needs to be reduced
    // Never split words - return what we have so far, but mark as incomplete
    // The caller will reduce font size and retry
    if (line) lines.push(line);
    return { lines, allWordsFit: false };
  }

  if (line) lines.push(line);
  
  // Validate all lines fit within maxWidth
  for (const lineText of lines) {
    if (measureTextWidth(ctx, lineText, fontSize, fontWeight) > maxWidth) {
      return { lines: [], allWordsFit: false };
    }
  }
  
  return { lines, allWordsFit: true };
}

/**
 * Create a lighter version of a color for frosted glass gradient effect
 * @param hexColor - Hex color string (e.g., '#8e8e93')
 * @param amount - How much lighter (0-1, default 0.15 for subtle shine)
 * @returns Lighter hex color
 */
function lightenColor(hexColor: string, amount: number = 0.15): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const newR = Math.min(255, Math.round(r + (255 - r) * amount));
  const newG = Math.min(255, Math.round(g + (255 - g) * amount));
  const newB = Math.min(255, Math.round(b + (255 - b) * amount));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function formatHeatDelta(value: number | null | undefined): string {
  // Handle new pulses (null heatDelta)
  if (value === null || value === undefined) return "NEW";
  // Value is percentage change between -1 and 1 (e.g., 0.3 = 30%, -0.4 = -40%)
  const percentage = value * 100;
  const rounded = Math.round(percentage);
  if (rounded === 0) return "0%";
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function Sparkline({ history, positive, isNew }: { history: HeatHistoryPoint[]; positive: boolean; isNew: boolean }) {
  const width = 144;
  const height = 34;

  // Calculate change magnitude from last 2 points (for color intensity)
  let changeMagnitude = 0;
  if (history.length >= 2) {
    const secondLastValue = history[history.length - 2]?.heatScore ?? 0;
    const lastValue = history[history.length - 1]?.heatScore ?? 0;
    changeMagnitude = secondLastValue > 0 ? Math.abs((lastValue - secondLastValue) / secondLastValue) * 100 : 0;
  }

  let strokeColor = "#6b7280";

  // Special styling for NEW items
  if (isNew) {
    strokeColor = "#eab308"; // Amber
  } else {
    // Use the 'positive' parameter for direction, changeMagnitude for intensity
    if (!positive) {
      // Declining trend
      if (changeMagnitude > 5) {
        strokeColor = "#dc2626"; // Bright red
      } else if (changeMagnitude > 0) {
        strokeColor = "#f59e0b"; // Orange
      }
    } else {
      // Growing trend
      if (changeMagnitude > 5) {
        strokeColor = "#16a34a"; // Bright green
      } else if (changeMagnitude > 0) {
        strokeColor = "#22c55e"; // Light green
      }
    }
  }

  const padding = 8;
  const startX = padding;
  const endX = width - padding;
  const midY = height / 2;
  const amplitude = height * 0.35;

  let trendPath: string;
  let areaPath: string;

  if (isNew) {
    // NEW: flat horizontal line
    trendPath = `M ${startX},${midY} L ${endX},${midY}`;
    areaPath = `M ${startX},${height} L ${startX},${midY} L ${endX},${midY} L ${endX},${height} Z`;
  } else if (!positive) {
    // Declining: line goes from top-left to bottom-right
    trendPath = `M ${startX},${midY - amplitude} L ${endX},${midY + amplitude}`;
    areaPath = `M ${startX},${height} L ${startX},${midY - amplitude} L ${endX},${midY + amplitude} L ${endX},${height} Z`;
  } else {
    // Growing: line goes from bottom-left to top-right
    trendPath = `M ${startX},${midY + amplitude} L ${endX},${midY - amplitude}`;
    areaPath = `M ${startX},${height} L ${startX},${midY + amplitude} L ${endX},${midY - amplitude} L ${endX},${height} Z`;
  }

  return (
    <svg width={width} height={height} className="block">
      <defs>
        <linearGradient id={`trend-gradient-${isNew ? 'new' : positive ? 'pos' : 'neg'}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#trend-gradient-${isNew ? 'new' : positive ? 'pos' : 'neg'})`}
      />

      {/* Main trend line */}
      <path
        d={trendPath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      {/* Endpoint circles */}
      <circle
        cx={startX}
        cy={isNew ? midY : !positive ? midY - amplitude : midY + amplitude}
        r={2.5}
        fill="white"
        stroke={strokeColor}
        strokeWidth={1.5}
      />
      <circle
        cx={endX}
        cy={isNew ? midY : !positive ? midY + amplitude : midY - amplitude}
        r={2.5}
        fill={strokeColor}
        stroke="white"
        strokeWidth={1.5}
      />
    </svg>
  );
}

export function PulseHeatTreemap({ categories, updatedAt, onPulseClick }: PulseHeatTreemapProps) {
  const t = useTranslations("Pulse");
  const { resolvedTheme } = useTheme();

  const gapColor = "#000000"; // Pure black to match pulse borders
  const categoryHeaderDefault = resolvedTheme === 'dark' ? "#000000" : "#2d3039"; // Black in dark mode, dark blue-gray in light mode
  const categoryLabelDefault = "#f8f8f8";
  const updatedBadgeBg = "bg-foreground/10 text-foreground/80";

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [treemapWidth, setTreemapWidth] = useState(WIDTH);
  const treemapHeight = useMemo(() => Math.round((treemapWidth / WIDTH) * HEIGHT), [treemapWidth]);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipRafRef = useRef<number | null>(null);
  const tooltipPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const allPulses = useMemo(() => categories.flatMap((category) => category.pulses), [categories]);
  
  // Calculate min/max heat scores for size contrast transformation
  const heatScoreRange = useMemo(() => {
    const scores = allPulses.map((pulse) => pulse.heatScore ?? 0).filter((s) => s > 0);
    if (scores.length === 0) return { minScore: 1, maxScore: 1 };
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    return { minScore, maxScore };
  }, [allPulses]);

  const selectedCategories = useMemo(() => {
    if (!activeCategoryId) return categories;
    return categories.filter((category) => category.id === activeCategoryId);
  }, [activeCategoryId, categories]);

  const preparedCategories = useMemo(() => {
    // ============================================
    // SIMPLIFIED CATEGORY SIZE CALCULATION
    // Goal: Each category gets different size based on heat, as square as possible
    // ============================================

    const categoryCount = Math.max(1, selectedCategories.length);
    const uniformShare = 1 / categoryCount;

    // Step 1: Get heat value for each category (using mock to ensure differences)
    const categoryHeats = selectedCategories.map((category, index) => {
      // Mock values with MINIMAL differences for maximum balance
      // Range: 950-1050 (only 1.1x difference)
      // Priority: All categories MUST be visible and similar in size
      const mockValues = [1000, 1020, 1040, 990, 1050, 970, 1010, 1030, 980, 1000, 1015, 995];
      return mockValues[index % mockValues.length];
    });

    // Step 2: Apply LINEAR transformation (1.0 exponent = no enhancement, just proportional)
    const minHeat = Math.min(...categoryHeats);
    const maxHeat = Math.max(...categoryHeats);
    const enhancedWeights = categoryHeats.map((heat) => {
      if (maxHeat <= minHeat) return 1;
      // Normalize to 0-1, apply 1.0 power (linear, no enhancement), scale to 1-101
      const normalized = (heat - minHeat) / (maxHeat - minHeat);
      return 1 + Math.pow(normalized, CATEGORY_SIZE_CONTRAST_EXPONENT) * 100;
    });

    // Step 3: Convert to shares (normalize to sum = 1)
    const totalWeight = enhancedWeights.reduce((sum, w) => sum + w, 0);
    const categoryShares = enhancedWeights.map((w) => (totalWeight > 0 ? w / totalWeight : uniformShare));

    // Step 4: Apply minimum size limit (each category at least 85% of average)
    // Very high minimum to ensure near-uniform distribution
    const minShare = uniformShare * 0.85;
    const adjustedShares = categoryShares.map((share) => Math.max(minShare, share));

    // Step 5: Re-normalize after applying minimum
    const adjustedTotal = adjustedShares.reduce((sum, s) => sum + s, 0);
    const finalShares = adjustedShares.map((s) => (adjustedTotal > 0 ? s / adjustedTotal : uniformShare));

    // Step 6: Create share map for lookup
    const categoryShareMap = new Map<number, number>(
      selectedCategories.map((category, idx) => [category.id, finalShares[idx] ?? uniformShare]),
    );

    return selectedCategories.map((category) => {
        const categoryShare = categoryShareMap.get(category.id) ?? uniformShare;
        const categoryWeight = categoryShare * CATEGORY_WEIGHT_SCALE;
        
        // Phase 1 (overview): Limit pulses per category for overview
        // Phase 2 (category selected): Show all pulses in the selected category
        const sortedPulses = [...category.pulses].sort((a, b) => (b.heatScore ?? 0) - (a.heatScore ?? 0));
        const candidatePulses = activeCategoryId 
          ? sortedPulses // Phase 2: Show all pulses
          : sortedPulses.slice(0, DISPLAY_PULSES_PER_CATEGORY); // Phase 1: Limit to DISPLAY_PULSES_PER_CATEGORY
        
        // Calculate raw sizes for candidate pulses using PULSE contrast exponent
        const candidateWithSizes = candidatePulses.map((pulse) => ({
          pulse,
          rawSize: transformScoreWithContrast(
            pulse.heatScore ?? 0,
            heatScoreRange.minScore,
            heatScoreRange.maxScore,
            PULSE_SIZE_CONTRAST_EXPONENT,
          ),
        }));
        
        const selectedPulseItems = candidateWithSizes;
        
        // Calculate sum of selected pulse raw sizes (for normalization)
        const selectedPulseRawTotal = selectedPulseItems.reduce((sum, item) => sum + item.rawSize, 0);

        return {
          categoryData: {
            type: "category",
            id: `cat-${category.id}`,
            label: category.name,
            heatScore: category.heatScore,
            heatDelta:
              category.pulses.length === 0
                ? null
                : (() => {
                    const deltas = category.pulses.map((p) => p.heatDelta).filter((d): d is number => d !== null);
                    return deltas.length > 0 ? deltas.reduce((acc, d) => acc + d, 0) / deltas.length : null;
                  })(),
            pulseCount: category.pulseCount,
            history: [],
            sizeValue: categoryWeight,
          } as TreeNodeData,
          pulses: selectedPulseItems.map(({ pulse, rawSize }, pulseIndex) => {
            const normalizedSize =
              selectedPulseRawTotal > 0
                ? (rawSize / selectedPulseRawTotal) * categoryWeight
                : categoryWeight / Math.max(1, selectedPulseItems.length);
            return {
              type: "pulse",
              parentCategoryId: category.id,
              id: `pulse-${pulse.id}`,
              label: normalizeTitle(pulse.title),
              rawTitle: pulse.title,
              heatScore: pulse.heatScore,
              heatDelta: pulse.heatDelta, // Preserve null for new pulses
              pulseCount: 1,
              content: pulse.content,
              history: pulse.history,
              sizeValue: normalizedSize,
              pulseIndexInCategory: pulseIndex, // For color variation to avoid adjacent duplicates
            } as TreeNodeData;
          }),
        };
    });
  }, [selectedCategories, heatScoreRange, activeCategoryId]);

  const { categoryNodes, pulseNodes } = useMemo(() => {
    const categoryRootData: TreeNodeData = {
      type: "root",
      id: "root",
      label: "PULSE",
      heatScore: 0,
      heatDelta: 0,
      pulseCount: 0,
      history: [],
      sizeValue: 0,
      children: preparedCategories.map((entry) => entry.categoryData),
    };
    const categoryRoot = hierarchy(categoryRootData).sum((node) =>
      node.type === "category" ? node.sizeValue : 0,
    );
    treemap<TreeNodeData>()
      .size([treemapWidth, treemapHeight])
      .paddingOuter(0)
      .paddingInner(0)
      .tile(treemapSquarify.ratio(MAX_TILE_ASPECT_RATIO))
      .round(true)(categoryRoot);

    const categoryLayoutNodes = ((categoryRoot.children ?? []) as TreemapNode[]).map((node) => {
      const inset = insetRectWithFixedGap(
        { x0: node.x0, y0: node.y0, x1: node.x1, y1: node.y1 },
        CATEGORY_GAP_PX,
        { x0: 0, y0: 0, x1: treemapWidth, y1: treemapHeight },
      );
      return { ...node, ...inset };
    });
    const categoryById = new Map(preparedCategories.map((entry) => [entry.categoryData.id, entry]));
    const pulseLayoutNodes: TreemapNode[] = [];
    const categoryHeaderHeight = 20;

    for (const categoryNode of categoryLayoutNodes) {
      const categoryEntry = categoryById.get(categoryNode.data.id);
      if (!categoryEntry || categoryEntry.pulses.length === 0) continue;

      const innerX0 = categoryNode.x0;
      const innerY0 = categoryNode.y0 + categoryHeaderHeight;
      const innerWidth = Math.max(0, categoryNode.x1 - categoryNode.x0);
      const innerHeight = Math.max(0, categoryNode.y1 - innerY0);
      if (innerWidth <= 0 || innerHeight <= 0) continue;

      const pulseRootData: TreeNodeData = {
        type: "root",
        id: `root-${categoryNode.data.id}`,
        label: "PULSE",
        heatScore: 0,
        heatDelta: 0,
        pulseCount: 0,
        history: [],
        sizeValue: 0,
        children: categoryEntry.pulses,
      };
      const pulseRoot = hierarchy(pulseRootData).sum((node) =>
        node.type === "pulse" ? node.sizeValue : 0,
      );
      treemap<TreeNodeData>()
        .size([innerWidth, innerHeight])
        .paddingOuter(0)
        .paddingInner(0)
        .tile(treemapSquarify.ratio(MAX_TILE_ASPECT_RATIO))
        .round(true)(pulseRoot);

      for (const pulseNode of pulseRoot.children ?? []) {
        const absoluteRect = {
          x0: pulseNode.x0 + innerX0,
          y0: pulseNode.y0 + innerY0,
          x1: pulseNode.x1 + innerX0,
          y1: pulseNode.y1 + innerY0,
        };
        const inset = insetRectWithFixedGap(
          absoluteRect,
          PULSE_GAP_PX,
          { x0: innerX0, y0: innerY0, x1: innerX0 + innerWidth, y1: innerY0 + innerHeight },
        );
        pulseLayoutNodes.push({
          x0: inset.x0,
          y0: inset.y0,
          x1: inset.x1,
          y1: inset.y1,
          data: pulseNode.data,
        });
      }
    }

    return { categoryNodes: categoryLayoutNodes, pulseNodes: pulseLayoutNodes };
  }, [preparedCategories, treemapWidth, treemapHeight]);

  const textMeasureCtx = useMemo(() => getTextMeasureContext(), []);

  const pulseRenderItems = useMemo(() => {
    return pulseNodes.map((node) => {
      const width = Math.max(0, node.x1 - node.x0);
      const height = Math.max(0, node.y1 - node.y0);
      const paddingX = clamp(width * 0.06, 4, 12);
      const paddingY = clamp(height * 0.08, 3, 10);
      const contentWidth = Math.max(0, width - paddingX * 2);
      const contentHeight = Math.max(0, height - paddingY * 2);
      const maxTextBlockHeight = contentHeight * TEXT_BLOCK_HEIGHT_RATIO;
      const titleText = node.data.label.toUpperCase();
      const heatDeltaText = formatHeatDelta(node.data.heatDelta);
      const canRenderAnyText = contentWidth >= 30 && contentHeight >= 18;
      const canTryHeat = contentWidth >= 42 && contentHeight >= 34;
      const titleWords = titleText.split(/\s+/).filter(Boolean);
      const parentCategoryId = node.data.parentCategoryId ?? 0;

      let titleLines: string[] = [];
      let titleFontSize = 0;
      let titleLineHeight = 0;
      let heatFontSize = 0;
      let heatLineHeight = 0;
      let adaptiveGap = 0;
      let blockTop = 0;
      let showTitle = false;
      let showHeat = false;

      if (canRenderAnyText && titleWords.length > 0) {
        // Solve title + heat as one stacked block.
        // Calculate font size based on box size, allowing smaller fonts for small boxes
        const startingFontSize = Math.min(
          TITLE_FONT_MAX,
          Math.max(5, Math.floor(Math.min(contentWidth * 0.18, contentHeight * 0.25))),
        );
        for (let fs = startingFontSize; fs >= 4; fs -= 1) {
          const wrappedResult = wrapWordsToWidth(textMeasureCtx, titleWords, contentWidth, fs, 700);
          // Allow up to 3 lines for better text visibility in small boxes
          if (!wrappedResult.allWordsFit || wrappedResult.lines.length === 0 || wrappedResult.lines.length > 3) continue;
          
          // Double-check: verify each line actually fits within width
          let allLinesFit = true;
          for (const lineText of wrappedResult.lines) {
            if (measureTextWidth(textMeasureCtx, lineText, fs, 700) > contentWidth) {
              allLinesFit = false;
              break;
            }
          }
          if (!allLinesFit) continue;
          
          const wrapped = wrappedResult.lines;

          const lineH = fs * 1.08;
          let localShowHeat = false;
          let localHeatFont = 0;
          let localHeatH = 0;
          let localGap = 0;

          if (canTryHeat) {
            localHeatFont = clamp(fs * 0.6, 10, HEAT_DELTA_FONT_MAX);
            while (
              localHeatFont >= 10 &&
              measureTextWidth(textMeasureCtx, heatDeltaText, localHeatFont, 700) > contentWidth
            ) {
              localHeatFont -= 1;
            }
            if (localHeatFont >= 10) {
              localShowHeat = true;
              localHeatH = localHeatFont * 1.06;
              localGap = clamp(fs * 0.15, 3, 8); // Gap between title and heat delta
            }
          }

          // Calculate actual text height accounting for baseline and descenders
          // SVG text y position is the baseline, so we need extra space below
          // Use more conservative estimates to ensure text never overflows
          const titleActualHeight = wrapped.length * lineH + lineH * 0.3; // Extra for descenders and spacing
          const heatActualHeight = localShowHeat ? localHeatH + localHeatFont * 0.3 : 0; // Extra for descenders
          const totalH = titleActualHeight + (localShowHeat ? localGap + heatActualHeight : 0);
          
          // Ensure total height fits with additional safety margin
          if (totalH > maxTextBlockHeight * 0.95) continue;

          titleLines = wrapped;
          titleFontSize = fs;
          titleLineHeight = lineH;
          showTitle = true;
          showHeat = localShowHeat;
          heatFontSize = localHeatFont;
          heatLineHeight = localHeatH;
          adaptiveGap = localGap;
          // Position title text - blockTop is where text rendering starts
          // Account for multi-line text centering
          const totalTextHeight = wrapped.length * lineH;
          const availableSpace = contentHeight - totalTextHeight;
          // Start position accounts for text needing space above and below
          blockTop = node.y0 + paddingY + Math.max(0, availableSpace / 2);
          break;
        }
      }

      const titleBlockHeight = titleLines.length * titleLineHeight;
      // heatY is the baseline - position it accounting for title height and gap
      // Use a smaller multiplier to account for text extending below baseline
      const heatY = blockTop + titleBlockHeight + adaptiveGap + heatLineHeight * 0.7;

      // Unified colors - no color variation, only size matters
      // Light mode: white with frosted glass gradient
      // Dark mode: dark gray, solid color
      const bgColor = resolvedTheme === 'dark' ? '#2c2c2e' : '#ffffff';
      const textColor = resolvedTheme === 'dark' ? '#ffffff' : '#000000';
      const borderColor = '#000000'; // Pure black border for both modes

      // Only apply gradient in light mode for frosted glass effect
      const lightColor = resolvedTheme === 'dark' ? bgColor : lightenColor(bgColor, 0.08);
      const midColor = resolvedTheme === 'dark' ? bgColor : lightenColor(bgColor, 0.03);

      return {
        node,
        width,
        height,
        clipPathRef: `url(#clip-${node.data.id})`,
        showTitle,
        showHeat,
        titleLines,
        titleFontSize,
        titleLineHeight,
        blockTop,
        heatFontSize,
        heatY,
        heatDeltaText,
        parentCategoryId,
        bgColor,
        lightColor,
        midColor,
        textColor,
        borderColor,
      };
    });
  }, [pulseNodes, textMeasureCtx, resolvedTheme]);

  const pulseClipDefs = useMemo(() => {
    return pulseRenderItems.map((item) => {
      // Tighter clip bounds to prevent any overflow
      const clipPadding = 2;
      return (
        <clipPath id={`clip-${item.node.data.id}`} key={`clip-${item.node.data.id}`}>
          <rect
            x={item.node.x0 + clipPadding}
            y={item.node.y0 + clipPadding}
            width={Math.max(0, item.width - clipPadding * 2)}
            height={Math.max(0, item.height - clipPadding * 2)}
          />
        </clipPath>
      );
    });
  }, [pulseRenderItems]);

  const pulseGradientDefs = useMemo(() => {
    return pulseRenderItems.map((item) => {
      const gradientId = `gradient-${item.node.data.id}`;
      return (
        <linearGradient id={gradientId} key={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={item.lightColor} stopOpacity="1" />
          <stop offset="50%" stopColor={item.midColor} stopOpacity="1" />
          <stop offset="100%" stopColor={item.bgColor} stopOpacity="1" />
        </linearGradient>
      );
    });
  }, [pulseRenderItems]);

  const hoveredCategoryNode = useMemo(() => {
    if (hoveredCategoryId === null) return null;
    return categoryNodes.find((node) => Number(node.data.id.replace("cat-", "")) === hoveredCategoryId) ?? null;
  }, [categoryNodes, hoveredCategoryId]);

  const syncTooltipPosition = () => {
    const point = tooltipPointerRef.current;
    const wrap = wrapRef.current;
    const tooltipEl = tooltipRef.current;
    if (!point || !wrap || !tooltipEl) return;

    const wrapRect = wrap.getBoundingClientRect();
    const tooltipWidth = tooltipEl.offsetWidth || TOOLTIP_WIDTH;
    const tooltipHeight = tooltipEl.offsetHeight || 260;
    const left = clamp(point.clientX - wrapRect.left + 14, 8, wrapRect.width - tooltipWidth - 8);
    const top = clamp(point.clientY - wrapRect.top + 14, 8, wrapRect.height - tooltipHeight - 8);
    tooltipEl.style.transform = `translate(${left}px, ${top}px)`;
  };

  const requestTooltipPositionSync = (clientX: number, clientY: number) => {
    tooltipPointerRef.current = { clientX, clientY };
    if (tooltipRafRef.current !== null) return;
    tooltipRafRef.current = window.requestAnimationFrame(() => {
      tooltipRafRef.current = null;
      syncTooltipPosition();
    });
  };

  useEffect(() => {
    if (!tooltip) return;
    syncTooltipPosition();
  }, [tooltip]);

  useEffect(() => {
    return () => {
      if (tooltipRafRef.current !== null) {
        window.cancelAnimationFrame(tooltipRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const updateSize = () => {
      const width = Math.round(el.clientWidth);
      if (width > 0) setTreemapWidth(width);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Scroll zoom interaction: zoom in to category, zoom out to show all
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent default page scroll
      e.preventDefault();

      const isZoomIn = e.deltaY < 0; // Scroll up = zoom in
      const isZoomOut = e.deltaY > 0; // Scroll down = zoom out

      if (isZoomIn && hoveredCategoryId !== null && activeCategoryId === null) {
        // Zoom in: enter hovered category
        setTimeout(() => {
          setActiveCategoryId(hoveredCategoryId);
        }, 300); // Match animation duration
      } else if (isZoomOut && activeCategoryId !== null) {
        // Zoom out: exit to show all categories
        setTimeout(() => {
          setActiveCategoryId(null);
        }, 300); // Match animation duration
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [hoveredCategoryId, activeCategoryId]);

  return (
    <div className="relative">
      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-sm"
        style={{
          backgroundColor: gapColor,
          fontFamily: "Arial, Helvetica, sans-serif",
          border: "1px solid #000000",
          borderTop: "none",
        }}
      >
      <svg
        viewBox={`0 0 ${treemapWidth} ${treemapHeight}`}
        className="block h-auto w-full"
        style={{ shapeRendering: "crispEdges", backgroundColor: gapColor }}
      >
        <rect x={0} y={0} width={treemapWidth} height={treemapHeight} fill={gapColor} />

        <defs>
          <filter id={MAP_TEXT_SHADOW_FILTER_ID} x="-20%" y="-20%" width="160%" height="160%">
            <feDropShadow dx="1" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.35" />
          </filter>
          {pulseClipDefs}
          {pulseGradientDefs}
        </defs>

        {categoryNodes.map((node) => {
          const width = Math.max(0, node.x1 - node.x0);
          const height = Math.max(0, node.y1 - node.y0);
          const categoryId = Number(node.data.id.replace("cat-", ""));
          const isHovered = hoveredCategoryId === categoryId;
          const isFocused = activeCategoryId === categoryId;
          return (
            <g
              key={`category-hit-${node.data.id}`}
              onMouseEnter={() => setHoveredCategoryId(categoryId)}
              onMouseLeave={() => setHoveredCategoryId(null)}
              onClick={() => {
                // Click to zoom in (same as scroll up)
                if (activeCategoryId === null) {
                  setTimeout(() => {
                    setActiveCategoryId(categoryId);
                  }, 300);
                }
              }}
              style={{ cursor: activeCategoryId === null ? "pointer" : "default" }}
            >
              <rect
                x={node.x0}
                y={node.y0}
                width={width}
                height={height}
                fill={isHovered || isFocused ? "#f2d21b" : "transparent"}
                fillOpacity={isHovered || isFocused ? 1 : 0}
              />
            </g>
          );
        })}

        {pulseRenderItems.map((item) => {
          const { node, width, height } = item;
          if (width <= 0 || height <= 0) return null;

          const pulseId = Number(node.data.id.replace("pulse-", ""));

          return (
            <g
              key={node.data.id}
              onMouseMove={(event) => requestTooltipPositionSync(event.clientX, event.clientY)}
              onMouseEnter={(event) => {
                if (item.parentCategoryId) setHoveredCategoryId(item.parentCategoryId);
                setTooltip(node.data);
                requestTooltipPositionSync(event.clientX, event.clientY);
              }}
              onMouseLeave={() => {
                setTooltip(null);
                setHoveredCategoryId(null);
              }}
              onClick={() => {
                // When zoomed in, click to scroll to card
                if (activeCategoryId !== null && onPulseClick) {
                  onPulseClick(pulseId);
                }
              }}
              style={{ cursor: activeCategoryId !== null ? "pointer" : "default" }}
            >
              {/* Always paint every leaf to prevent "black holes" from hidden tiny tiles */}
              <rect
                x={node.x0}
                y={node.y0}
                width={width}
                height={height}
                fill={`url(#gradient-${node.data.id})`}
              />

              {item.showTitle ? (
                <text
                  x={Math.round(node.x0 + width / 2)}
                  textAnchor="middle"
                  fill={item.textColor}
                  fontWeight={700}
                  fontSize={item.titleFontSize}
                  clipPath={item.clipPathRef}
                  textRendering="geometricPrecision"
                >
                  {item.titleLines.map((line, idx) => (
                    <tspan
                      key={`${node.data.id}-line-${idx}`}
                      x={Math.round(node.x0 + width / 2)}
                      y={Math.round(item.blockTop + (idx + 1) * item.titleLineHeight)}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              ) : null}

              {item.showHeat ? (
                <>
                  {/* Breathing indicator dot for NEW items */}
                  {(node.data.heatDelta === null || node.data.heatDelta === undefined) && (
                    <circle
                      cx={Math.round(node.x0 + width / 2 - item.heatFontSize * 1.5)}
                      cy={Math.round(item.heatY - item.heatFontSize * 0.3)}
                      r={item.heatFontSize * 0.15}
                      fill="#18FF19"
                    >
                      <animate
                        attributeName="opacity"
                        values="0.3;1;0.3"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="r"
                        values={`${item.heatFontSize * 0.12};${item.heatFontSize * 0.18};${item.heatFontSize * 0.12}`}
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                  <text
                    x={Math.round(node.x0 + width / 2)}
                    y={Math.round(item.heatY)}
                    textAnchor="middle"
                    dominantBaseline="alphabetic"
                    fill={item.textColor}
                    fontWeight={600}
                    fontSize={item.heatFontSize}
                    opacity={0.95}
                    clipPath={item.clipPathRef}
                    textRendering="geometricPrecision"
                  >
                    {item.heatDeltaText}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}

        {categoryNodes.map((node) => {
          const width = Math.max(0, node.x1 - node.x0);
          const height = Math.max(0, node.y1 - node.y0);
          const categoryId = Number(node.data.id.replace("cat-", ""));
          const isHovered = hoveredCategoryId === categoryId;
          const isFocused = activeCategoryId === categoryId;
          return (
            <g key={`category-overlay-${node.data.id}`} style={{ pointerEvents: "none" }}>
              <rect
                x={node.x0}
                y={node.y0}
                width={width}
                height={height}
                fill="none"
                // Default border is removed to prevent double-stroked shared boundaries.
                stroke={isHovered || isFocused ? "#f2d21b" : "none"}
                strokeWidth={isHovered || isFocused ? 1.4 : 0}
              />
              <rect
                x={node.x0 + 1}
                y={node.y0 + 1}
                width={Math.max(0, width - 2)}
                height={17}
                fill={isHovered || isFocused ? "#f2d21b" : categoryHeaderDefault}
              />
              <text
                x={node.x0 + 4}
                y={node.y0 + 13}
                fontSize={11}
                fontWeight={700}
                fill={isHovered || isFocused ? "#0b0c10" : categoryLabelDefault}
                textRendering="geometricPrecision"
              >
                {node.data.label.toUpperCase()}
              </text>
            </g>
          );
        })}

        {hoveredCategoryNode ? (
          <g style={{ pointerEvents: "none" }}>
            <rect
              x={hoveredCategoryNode.x0}
              y={hoveredCategoryNode.y0}
              width={Math.max(0, hoveredCategoryNode.x1 - hoveredCategoryNode.x0)}
              height={Math.max(0, hoveredCategoryNode.y1 - hoveredCategoryNode.y0)}
              fill="none"
              stroke="#f2d21b"
              strokeWidth={1.6}
            />
          </g>
        ) : null}
      </svg>

      {tooltip ? (
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute z-20 w-[320px] max-w-[320px] border-[4px] border-[#2c3038] bg-[#eceff2] text-[#1f232b]"
          style={{ left: 0, top: 0 }}
        >
          {/* Header strip - finviz-like neutral top bar */}
          <div className="border-b border-[#b8bdc4] bg-[#e4e7ec] px-3 py-1.5">
            <div className="break-words whitespace-normal text-[12px] font-extrabold uppercase leading-tight tracking-[0.02em] text-[#232831]">
              {tooltip.rawTitle || tooltip.label}
            </div>
          </div>

          {/* Dominant colored row - HEAT section */}
          <div
            className={cn(
              "px-4 py-3",
              tooltip.heatDelta === null || tooltip.heatDelta === undefined
                ? "bg-[#454952]"
                : tooltip.heatDelta >= 0
                  ? "bg-[#30cc5a]"
                  : "bg-[#c6383f]",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-[18px] font-bold text-white dark:text-white">{t("heat").toUpperCase()}</div>
              </div>
              <div className="text-right">
                <div className="text-[18px] font-bold text-white dark:text-white">
                  {Math.round(tooltip.heatScore).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* White section with aligned data rows */}
          <div className="bg-[#eef1f5]">
            {/* DELTA row with sparkline */}
            {tooltip.history.length > 0 ? (
              <>
                <div className="flex items-center justify-between border-b border-[#c8cdd4] px-4 py-2.5">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[11px] font-bold text-gray-700">{t("delta").toUpperCase()}</span>
                    <div className="flex-shrink-0">
                      <Sparkline
                        history={tooltip.history}
                        positive={tooltip.heatDelta !== null && tooltip.heatDelta !== undefined && tooltip.heatDelta >= 0}
                        isNew={tooltip.heatDelta === null || tooltip.heatDelta === undefined}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        "text-[11px] font-bold",
                        tooltip.heatDelta === null || tooltip.heatDelta === undefined
                          ? "text-gray-700"
                          : tooltip.heatDelta >= 0
                            ? "text-[#30cc5a]"
                            : "text-[#c6383f]",
                      )}
                    >
                      {formatHeatDelta(tooltip.heatDelta)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between border-b border-[#c8cdd4] px-4 py-2.5">
                <span className="text-[11px] font-bold text-gray-700">{t("delta").toUpperCase()}</span>
                <span
                  className={cn(
                    "text-[11px] font-bold",
                    tooltip.heatDelta === null || tooltip.heatDelta === undefined
                      ? "text-gray-700"
                      : tooltip.heatDelta >= 0
                        ? "text-[#30cc5a]"
                        : "text-[#c6383f]",
                  )}
                >
                  {formatHeatDelta(tooltip.heatDelta)}
                </span>
              </div>
            )}

            {/* Summary section - full content without truncation */}
            {tooltip.content ? (
              <div className="px-4 py-3">
                <div className="mb-1.5 text-[10px] font-bold uppercase text-gray-600">{t("summary").toUpperCase()}</div>
                <div
                  className="max-h-[400px] overflow-y-auto break-words whitespace-normal text-[11px] leading-relaxed text-gray-700"
                  style={{ overflowWrap: "anywhere" }}
                >
                  {tooltip.content}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={cn("pointer-events-none absolute right-2 top-6 rounded px-2 py-1 text-[10px]", updatedBadgeBg)}>
        {t("updated")} {new Date(updatedAt).toLocaleString()}
      </div>

      {/* Zoom hint overlay - fixed position at bottom center */}
      {!activeCategoryId && hoveredCategoryId !== null && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in rounded-xl bg-popover/95 border border-border px-6 py-3 text-sm font-semibold text-popover-foreground shadow-lg backdrop-blur-md">
          ↑ Scroll up to zoom in
        </div>
      )}

      {activeCategoryId && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in rounded-xl bg-popover/95 border border-border px-6 py-3 text-sm font-semibold text-popover-foreground shadow-lg backdrop-blur-md">
          ↓ Scroll down to zoom out
        </div>
      )}
    </div>

    </div>
  );
}

