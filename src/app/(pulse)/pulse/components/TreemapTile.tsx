"use client";

import { useState, MouseEvent } from "react";
import { getShortTitle } from "../lib/treemapData";

interface Pulse {
  id: number;
  title: string;
  category: { name: string };
  heatScore: number | null;
  heatDelta: number | null;
  createdAt: Date;
}

interface TreemapTileProps {
  pulse: Pulse;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  onClick?: () => void;
  onHover?: (pulse: Pulse, position: { x: number; y: number }) => void;
  onHoverEnd?: () => void;
}

/**
 * Individual treemap tile component - Finviz Style
 * White border on hover, scaled text, Central Gothic font
 */
export function TreemapTile({
  pulse,
  x,
  y,
  width,
  height,
  color,
  onClick,
  onHover,
  onHoverEnd,
}: TreemapTileProps) {
  const [isHovered, setIsHovered] = useState(false);

  const shortTitle = getShortTitle(pulse.title);
  const heatScoreText = pulse.heatScore?.toFixed(0) ?? "0";

  // Text size dynamically follows box width to match reference behavior.
  const titleFontSize = Math.max(Math.min(width * 0.09, 24), 7);
  const scoreFontSize = Math.max(Math.min(width * 0.072, 18), 6);

  const showTitle = width > 38 && height > 24;
  const showScore = width > 50 && height > 32;

  const titleWords = shortTitle.split(/\s+/).slice(0, 3);
  const maxCharsPerLine = Math.max(4, Math.floor((width - 10) / (titleFontSize * 0.62)));
  const titleLines: string[] = [];
  let currentLine = "";

  for (const word of titleWords) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharsPerLine || currentLine.length === 0) {
      currentLine = candidate;
    } else {
      titleLines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine.length > 0) titleLines.push(currentLine);
  const finalTitleLines = titleLines.slice(0, 3);
  const lineHeight = titleFontSize * 1.08;
  const titleBlockHeight = finalTitleLines.length * lineHeight;

  const handleMouseEnter = (e: MouseEvent<SVGRectElement>) => {
    setIsHovered(true);
    // Use actual mouse position for tooltip (Finviz style - tooltip follows cursor)
    if (onHover) {
      onHover(pulse, {
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent<SVGRectElement>) => {
    // Update tooltip position to follow mouse cursor
    if (onHover && isHovered) {
      onHover(pulse, {
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onHoverEnd) {
      onHoverEnd();
    }
  };

  // Finviz hover effect: white border 1-2px thick, slightly lighter background
  const hoverColor = isHovered ? adjustColorBrightness(color, 1.15) : color;
  const strokeColor = isHovered ? "white" : "rgba(0, 0, 0, 0.3)";
  const strokeWidth = isHovered ? 2 : 1;

  return (
    <>
      <g>
        {/* Tile Rectangle - Finviz style: no rounded corners */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={hoverColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          className="cursor-pointer transition-all duration-150"
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={onClick}
        />

        {/* Title: max 3 words, auto next line, centered */}
        {showTitle && (
          <text
            x={x + width / 2}
            y={y + height / 2 - (showScore ? scoreFontSize * 0.6 : 0) - titleBlockHeight / 2 + lineHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontFamily: "var(--font-CentralGothic), 'Inter', sans-serif",
              fontSize: `${titleFontSize}px`,
              fontWeight: 700,
              fill: "white",
              pointerEvents: "none",
              userSelect: "none",
              textShadow: "0 1px 2px rgba(0,0,0,1)",
            }}
          >
            {finalTitleLines.map((line, index) => (
              <tspan
                key={`${pulse.id}-${index}`}
                x={x + width / 2}
                dy={index === 0 ? 0 : lineHeight}
              >
                {line}
              </tspan>
            ))}
          </text>
        )}

        {/* HEAT Score - centered below title */}
        {showScore && (
          <text
            x={x + width / 2}
            y={y + height / 2 + (showTitle ? titleBlockHeight * 0.5 : 0) + scoreFontSize * 0.15}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontFamily: "var(--font-CentralGothic), 'Inter', sans-serif",
              fontSize: `${scoreFontSize}px`,
              fontWeight: 500,
              fill: "white",
              opacity: 0.95,
              pointerEvents: "none",
              userSelect: "none",
              textShadow: "0 1px 2px rgba(0,0,0,1)",
            }}
          >
            {heatScoreText}
          </text>
        )}
      </g>

      {/* Tooltip will be rendered by parent component using portal */}
    </>
  );
}

/**
 * Adjust color brightness for hover effect (Finviz style)
 */
function adjustColorBrightness(color: string, factor: number): string {
  // Parse RGB color
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return color;

  const r = Math.min(255, Math.round(parseInt(match[1]) * factor));
  const g = Math.min(255, Math.round(parseInt(match[2]) * factor));
  const b = Math.min(255, Math.round(parseInt(match[3]) * factor));

  return `rgb(${r}, ${g}, ${b})`;
}
