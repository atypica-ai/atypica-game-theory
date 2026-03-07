"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { hierarchy, treemap as d3Treemap } from "d3-hierarchy";
import { TreemapTile } from "./TreemapTile";
import { TreemapTooltip } from "./TreemapTooltip";
import { createTreemapHierarchy, type TreemapNode } from "../lib/treemapData";
import { createHeatDeltaColorScale } from "../lib/treemapColors";
import { useTranslations } from "next-intl";

interface Pulse {
  id: number;
  title: string;
  category: { name: string };
  heatScore: number | null;
  heatDelta: number | null;
  createdAt: Date;
}

interface HeatHistoryPoint {
  date: string;
  heatScore: number;
}

interface TreemapVisualizationProps {
  pulses: Pulse[];
  heatHistory: Record<number, HeatHistoryPoint[]>;
  selectedCategory: string | null;
  onCategoryClick: (category: string) => void;
}

/**
 * D3 Treemap Visualization Component - Finviz Style
 * Dark background, precise gap control, two-stage drill-down
 */
export function TreemapVisualization({
  pulses,
  heatHistory,
  selectedCategory,
  onCategoryClick,
}: TreemapVisualizationProps) {
  const t = useTranslations("PulsePage");
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });
  const [hoveredPulse, setHoveredPulse] = useState<{ pulse: Pulse; position: { x: number; y: number } } | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = Math.max(600, width * 0.5); // Maintain aspect ratio, min 600px
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Create color scale based on all heat deltas
  const colorScale = useMemo(() => {
    return createHeatDeltaColorScale(pulses);
  }, [pulses]);

  // Create treemap layout with D3 - Finviz gap specifications
  const treemapRoot = useMemo(() => {
    const { width, height } = dimensions;

    // Create hierarchy from pulses data
    const hierarchyData = createTreemapHierarchy(pulses, selectedCategory);
    const root = hierarchy(hierarchyData)
      .sum((d) => (d as { value?: number }).value ?? 0);

    // Compact dual-gap setup: category gaps slightly larger than tile gaps.
    const treemap = d3Treemap()
      .size([width, height])
      .paddingOuter(selectedCategory ? 1.5 : 4.25)
      .paddingInner(selectedCategory ? 1 : 1.8)
      .round(true);

    return treemap(root);
  }, [dimensions, pulses, selectedCategory]);

  // Extract leaf nodes (actual pulse tiles) and category nodes with bounding boxes
  const nodes = useMemo(() => {
    const leaves = treemapRoot.descendants().filter((node) => !node.children);
    const categories = new Map<string, { nodes: typeof leaves; bounds: { x0: number; y0: number; x1: number; y1: number } }>();

    if (!selectedCategory) {
      // Stage 1: Group by category and calculate bounding boxes
      for (const leaf of leaves) {
        const parentData = leaf.parent?.data as TreemapNode | undefined;
        const categoryName = parentData?.name;
        if (categoryName && categoryName !== "root") {
          if (!categories.has(categoryName)) {
            categories.set(categoryName, {
              nodes: [],
              bounds: { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
            });
          }
          const category = categories.get(categoryName)!;
          category.nodes.push(leaf);
          // Update bounding box
          category.bounds.x0 = Math.min(category.bounds.x0, leaf.x0);
          category.bounds.y0 = Math.min(category.bounds.y0, leaf.y0);
          category.bounds.x1 = Math.max(category.bounds.x1, leaf.x1);
          category.bounds.y1 = Math.max(category.bounds.y1, leaf.y1);
        }
      }
    }

    return { leaves, categories };
  }, [treemapRoot, selectedCategory]);

  // Empty state
  if (pulses.length === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-lg border border-dashed bg-[#1a1a1a]">
        <div className="text-center">
          <p className="text-muted-foreground">{t("noPulseData")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("runHeatCalc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full relative">
      {/* Finviz-style dark background SVG - exact dark gray/black background */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="bg-[#0d1117]"
        style={{ display: "block" }}
      >
        {/* Stage 2: Detail view - all pulses in category */}
        {selectedCategory &&
          nodes.leaves.map((node) => {
            const nodeData = node.data as TreemapNode;
            const pulse = nodeData.data;
            if (!pulse) return null;

            const color = colorScale(pulse.heatDelta ?? 0);

            return (
              <TreemapTile
                key={pulse.id}
                pulse={pulse}
                x={node.x0}
                y={node.y0}
                width={node.x1 - node.x0}
                height={node.y1 - node.y0}
                color={color}
                onHover={(pulse, position) => setHoveredPulse({ pulse, position })}
                onHoverEnd={() => setHoveredPulse(null)}
              />
            );
          })}

        {/* Stage 1: Overview - categories with hoverable category boxes */}
        {!selectedCategory &&
          Array.from(nodes.categories.entries()).map(([categoryName, categoryData]) => {
            const { nodes: categoryNodes, bounds } = categoryData;
            const isCategoryHovered = hoveredCategory === categoryName;
            return (
              <g
                key={categoryName}
                onMouseEnter={() => setHoveredCategory(categoryName)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                {/* Category bounding box with yellow hover outline */}
                <rect
                  x={bounds.x0 - 1}
                  y={bounds.y0 - 1}
                  width={bounds.x1 - bounds.x0 + 2}
                  height={bounds.y1 - bounds.y0 + 2}
                  fill="none"
                  stroke={isCategoryHovered ? "#facc15" : "#374151"}
                  strokeWidth={isCategoryHovered ? 2 : 1}
                  opacity={isCategoryHovered ? 0.95 : 0.45}
                  className="cursor-pointer"
                  onClick={() => onCategoryClick(categoryName)}
                />

                {/* Category header strip */}
                <rect
                  x={bounds.x0}
                  y={bounds.y0}
                  width={Math.max(0, bounds.x1 - bounds.x0)}
                  height={13}
                  fill={isCategoryHovered ? "#facc15" : "rgba(3, 8, 20, 0.88)"}
                  className="cursor-pointer"
                  onClick={() => onCategoryClick(categoryName)}
                />

                {/* Category label text */}
                <text
                  x={bounds.x0 + 3}
                  y={bounds.y0 + 10}
                  fill={isCategoryHovered ? "#111827" : "#9ca3af"}
                  fontSize="9px"
                  fontWeight={600}
                  fontFamily="var(--font-CentralGothic), 'Inter', sans-serif"
                  textAnchor="start"
                  dominantBaseline="alphabetic"
                  className="cursor-pointer"
                  style={{
                    textShadow: "0 1px 2px rgba(0,0,0,1)",
                    letterSpacing: "0.25px",
                  }}
                  onClick={() => onCategoryClick(categoryName)}
                >
                  {categoryName.toUpperCase()}
                </text>

                {/* Tiles within category */}
                {categoryNodes.map((node) => {
                  const nodeData = node.data as TreemapNode;
                  const pulse = nodeData.data;
                  if (!pulse) return null;

                  const color = colorScale(pulse.heatDelta ?? 0);

                  return (
                    <TreemapTile
                      key={pulse.id}
                      pulse={pulse}
                      x={node.x0}
                      y={node.y0}
                      width={node.x1 - node.x0}
                      height={node.y1 - node.y0}
                      color={color}
                      onClick={() => onCategoryClick(categoryName)}
                      onHover={(pulse, position) => setHoveredPulse({ pulse, position })}
                      onHoverEnd={() => setHoveredPulse(null)}
                    />
                  );
                })}
              </g>
            );
          })}
      </svg>

      {/* Tooltip rendered outside SVG using portal */}
      {hoveredPulse && (
        <TreemapTooltip
          pulse={hoveredPulse.pulse}
          heatHistory={heatHistory}
          position={hoveredPulse.position}
        />
      )}
    </div>
  );
}
