"use client";

interface Pulse {
  heatDelta: number | null;
}

/**
 * Color contrast controls (user-adjustable)
 * Increase multiplier/exponent for stronger red/green contrast.
 */
export const HEAT_DELTA_MIN = -120;
export const HEAT_DELTA_MAX = 120;
export const HEAT_DELTA_CONTRAST_MULTIPLIER = 1.9;
export const HEAT_DELTA_CONTRAST_EXPONENT = 1.1;

/**
 * Create a D3 color scale for heat delta visualization - Finviz Style
 * Maps heat delta to colors: red (negative) → gray (neutral) → green (positive)
 * Color depth/intensity increases with absolute delta magnitude
 * Post-processes deltas to create more visual contrast
 */
export function createHeatDeltaColorScale(pulses: Pulse[]) {
  const deltas = pulses
    .map((p) => p.heatDelta ?? 0)
    .filter((d) => !isNaN(d) && isFinite(d));

  const observedMaxAbs = Math.max(...deltas.map((d) => Math.abs(d)), 1);
  const clampMaxAbs = Math.max(Math.abs(HEAT_DELTA_MIN), Math.abs(HEAT_DELTA_MAX), observedMaxAbs);

  const normalizeAndEnhance = (delta: number) => {
    const clamped = Math.max(HEAT_DELTA_MIN, Math.min(HEAT_DELTA_MAX, delta));
    const sign = clamped >= 0 ? 1 : -1;
    const normalized = Math.min(1, Math.abs(clamped) / clampMaxAbs);
    const contrasted =
      Math.pow(normalized, HEAT_DELTA_CONTRAST_EXPONENT) * HEAT_DELTA_CONTRAST_MULTIPLIER;
    return { sign, strength: Math.max(0, Math.min(1, contrasted)) };
  };

  return (delta: number): string => {
    const { sign, strength } = normalizeAndEnhance(delta);
    if (strength < 0.008) {
      return "#6b7280";
    }

    if (sign < 0) {
      // High contrast red range
      const r = Math.round(210 + strength * 35);
      const g = Math.round(58 - strength * 40);
      const b = Math.round(58 - strength * 40);
      return `rgb(${r}, ${g}, ${b})`;
    }

    // High contrast green range
    const r = Math.round(34 - strength * 18);
    const g = Math.round(130 + strength * 78);
    const b = Math.round(70 - strength * 28);
    return `rgb(${r}, ${g}, ${b})`;
  };
}

/**
 * Get Tailwind color class for heat delta (for text display)
 */
export function getHeatDeltaColorClass(delta: number): string {
  if (delta > 0) return "text-green-600";
  if (delta < 0) return "text-red-600";
  return "text-gray-500";
}
