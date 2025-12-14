// TypeScript types for Creators page components

import type { ComponentType } from "react";

export interface AnimationConfig {
  duration: number;
  delay: number;
  easing?: string;
}

export interface PainPoint {
  key: string;
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  borderColor: string;
}

export interface Feature {
  id: "research" | "persona" | "podcast";
  key: string;
  accentColor: string;
}

export interface AdvancedFeature {
  key: "contentColumn" | "differentiation" | "paidContent";
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

export interface Benefit {
  key: "benefit1" | "benefit2" | "benefit3";
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  borderColor: string;
}

export interface StarPosition {
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  delay: number; // Seconds
}
