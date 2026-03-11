import { useEffect, useRef } from "react";

export interface TooltipPositionOptions {
  /** Offset from cursor in pixels (default: 14) */
  offset?: number;
  /** Minimum padding from viewport edges in pixels (default: 8) */
  padding?: number;
}

/**
 * Hook for viewport-aware tooltip positioning that follows the cursor.
 * Automatically repositions tooltip to prevent overflow at viewport edges.
 *
 * @example
 * const { tooltipRef, updatePosition } = useTooltipPosition();
 *
 * <div onMouseMove={(e) => updatePosition(e.clientX, e.clientY)}>
 *   <div ref={tooltipRef} className="fixed ...">Tooltip content</div>
 * </div>
 */
export function useTooltipPosition(options: TooltipPositionOptions = {}) {
  const { offset = 14, padding = 8 } = options;

  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointerRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const isMountedRef = useRef(true);

  const syncPosition = () => {
    if (!isMountedRef.current) return;

    const point = pointerRef.current;
    const tooltipEl = tooltipRef.current;
    if (!point || !tooltipEl) return;

    const tooltipWidth = tooltipEl.offsetWidth;
    const tooltipHeight = tooltipEl.offsetHeight;

    // Calculate initial position (right and below cursor)
    let left = point.clientX + offset;
    let top = point.clientY + offset;

    // Adjust horizontal position if tooltip would overflow right edge
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = point.clientX - tooltipWidth - offset;
    }

    // Adjust vertical position if tooltip would overflow bottom edge
    if (top + tooltipHeight > window.innerHeight - padding) {
      top = point.clientY - tooltipHeight - offset;
    }

    // Ensure tooltip doesn't go off left or top edges
    left = Math.max(padding, left);
    top = Math.max(padding, top);

    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
  };

  const updatePosition = (clientX: number, clientY: number) => {
    pointerRef.current = { clientX, clientY };

    // Debounce with RAF to avoid excessive calculations
    if (rafRef.current !== null) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      syncPosition();
    });
  };

  // Cleanup RAF on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return {
    tooltipRef,
    updatePosition,
  };
}
